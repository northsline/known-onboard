// WebSerial provisioning client.
//
// Talks to the Pico over a USB CDC/ACM serial port using a line-delimited JSON
// protocol (see lib/provisioning.py on the firmware side).

import { SERIAL_BAUD, SERIAL_FILTERS } from '$lib/config';

export interface IdentifyResult {
	code: string | null;
	device_id: string | null;
}

export interface SerialResponse {
	status: 'ok' | 'error' | 'ready';
	reason?: string;
	[key: string]: unknown;
}

let port: SerialPort | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let rxBuffer = '';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const BOOT_DELAY_MS = 3000;
const IDENTIFY_TIMEOUT_MS = 25000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSerialSupported(): boolean {
	return typeof navigator !== 'undefined' && 'serial' in navigator;
}

async function readChunk(timeoutMs: number): Promise<Uint8Array | null> {
	if (!reader) throw new Error('Serial port is not open.');

	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			reader.read().then(({ value, done }) => {
				if (done) throw new Error('Serial connection closed by the device.');
				return value ?? null;
			}),
			new Promise<null>((resolve) => {
				timer = setTimeout(() => resolve(null), timeoutMs);
			})
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

/** Read one line, waiting up to timeoutMs. Keeps partial data in rxBuffer. */
async function readLine(timeoutMs: number): Promise<string | null> {
	if (!reader) throw new Error('Serial port is not open.');

	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const nl = rxBuffer.indexOf('\n');
		if (nl >= 0) {
			const line = rxBuffer.slice(0, nl).replace(/\r$/, '').trim();
			rxBuffer = rxBuffer.slice(nl + 1);
			if (line) return line;
			continue;
		}

		const remaining = deadline - Date.now();
		if (remaining <= 0) break;

		const chunk = await readChunk(Math.min(remaining, 300));
		if (chunk) rxBuffer += decoder.decode(chunk, { stream: true });
	}
	return null;
}

function parseResponse(line: string): SerialResponse | null {
	try {
		const res = JSON.parse(line) as SerialResponse;
		if (res && typeof res === 'object' && 'status' in res) return res;
	} catch {
		// not JSON
	}
	return null;
}

/** Wait for boot + firmware ready beacon after the port open reboots the Pico. */
async function waitForDeviceReady(): Promise<void> {
	await sleep(BOOT_DELAY_MS);

	const deadline = Date.now() + 12000;
	while (Date.now() < deadline) {
		const line = await readLine(500);
		if (!line) continue;
		const res = parseResponse(line);
		if (res?.status === 'ready') return;
		if (line.includes('Waiting for USB setup')) return;
	}
}

export async function connectSerial(): Promise<void> {
	if (!isSerialSupported()) {
		throw new Error('WebSerial is not supported. Use Chrome or Edge to set up your Known.');
	}

	port = await navigator.serial.requestPort({ filters: SERIAL_FILTERS });
	await port.open({ baudRate: SERIAL_BAUD });

	if (!port.readable || !port.writable) {
		throw new Error('Serial port opened without read/write streams.');
	}

	reader = port.readable.getReader();
	writer = port.writable.getWriter();
	rxBuffer = '';

	await waitForDeviceReady();
}

export async function disconnectSerial(): Promise<void> {
	try {
		await reader?.cancel();
	} catch {
		// ignore
	}
	try {
		reader?.releaseLock();
		writer?.releaseLock();
		await port?.close();
	} catch {
		// ignore
	}
	reader = null;
	writer = null;
	port = null;
	rxBuffer = '';
}

export async function sendCommand(cmd: object): Promise<void> {
	if (!writer) throw new Error('Serial port is not open.');
	await writer.write(encoder.encode(JSON.stringify(cmd) + '\n'));
}

/** Read until a JSON response with a status field arrives (skips boot text). */
export async function readResponse(timeoutMs = 8000): Promise<SerialResponse> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		const line = await readLine(Math.max(remaining, 200));
		if (!line) continue;
		const res = parseResponse(line);
		if (res && res.status !== 'ready') return res;
	}
	throw new Error('Timed out waiting for the device to respond.');
}

export async function identifyDevice(): Promise<IdentifyResult> {
	const deadline = Date.now() + IDENTIFY_TIMEOUT_MS;
	let lastReason = 'unknown error';

	while (Date.now() < deadline) {
		await sendCommand({ cmd: 'identify' });

		try {
			const res = await readResponse(4000);
			if (res.status === 'ok') {
				return {
					code: (res.code as string) ?? null,
					device_id: (res.device_id as string) ?? null
				};
			}
			lastReason = res.reason ?? 'unknown error';
			if (res.reason !== 'bad_json') break;
		} catch {
			// keep retrying until IDENTIFY_TIMEOUT_MS
		}

		await sleep(800);
	}

	throw new Error(`Device identify failed: ${lastReason}`);
}

export async function provisionDevice(
	ssid: string,
	pass: string,
	code: string
): Promise<SerialResponse> {
	await sendCommand({ cmd: 'provision', ssid, pass, code });
	const res = await readResponse(15000);
	if (res.status !== 'ok') {
		throw new Error(`Provisioning failed: ${res.reason ?? 'unknown error'}`);
	}
	return res;
}
