// WebSerial provisioning client.
//
// Talks to the Pico over a USB CDC/ACM serial port using a line-delimited JSON
// protocol (see lib/provisioning.py on the firmware side):
//
//   identify  -> { code, device_id }
//   provision -> { ssid, pass, code } => { status: 'ok' } | { status, reason }
//
// WebSerial (navigator.serial) is Chrome/Edge only. Call isSerialSupported()
// before attempting a connection and surface a clear message otherwise.

import { SERIAL_BAUD, SERIAL_FILTERS } from '$lib/config';

export interface IdentifyResult {
	code: string | null;
	device_id: string | null;
}

export interface SerialResponse {
	status: 'ok' | 'error';
	reason?: string;
	[key: string]: unknown;
}

let port: SerialPort | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let rxBuffer = '';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** WebSerial is only available in Chromium-based browsers over a secure origin. */
export function isSerialSupported(): boolean {
	return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Prompt the user to pick the Pico port and open it at 115200 baud. */
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
}

/** Close the port and release its streams. Safe to call multiple times. */
export async function disconnectSerial(): Promise<void> {
	try {
		await reader?.cancel();
	} catch {
	}
	try {
		reader?.releaseLock();
		writer?.releaseLock();
		await port?.close();
	} catch {
		
	}
	reader = null;
	writer = null;
	port = null;
	rxBuffer = '';
}

/** Serialize a command to JSON, append a newline, and write it to the port. */
export async function sendCommand(cmd: object): Promise<void> {
	if (!writer) throw new Error('Serial port is not open.');
	await writer.write(encoder.encode(JSON.stringify(cmd) + '\n'));
}

/** Read until a newline arrives, then JSON.parse the line into a response. */
export async function readResponse(timeoutMs = 8000): Promise<SerialResponse> {
	if (!reader) throw new Error('Serial port is not open.');

	const deadline = Date.now() + timeoutMs;
	while (true) {
		const nl = rxBuffer.indexOf('\n');
		if (nl >= 0) {
			const line = rxBuffer.slice(0, nl).trim();
			rxBuffer = rxBuffer.slice(nl + 1);
			if (line) return JSON.parse(line) as SerialResponse;
			continue;
		}
		if (Date.now() > deadline) {
			throw new Error('Timed out waiting for the device to respond.');
		}
		const { value, done } = await reader.read();
		if (done) throw new Error('Serial connection closed by the device.');
		if (value) rxBuffer += decoder.decode(value, { stream: true });
	}
}

/** Ask the device for its sticker code and id. */
export async function identifyDevice(): Promise<IdentifyResult> {
	await sendCommand({ cmd: 'identify' });
	const res = await readResponse();
	if (res.status !== 'ok') {
		throw new Error(`Device identify failed: ${res.reason ?? 'unknown error'}`);
	}
	return {
		code: (res.code as string) ?? null,
		device_id: (res.device_id as string) ?? null
	};
}

/** Send Wi-Fi credentials + sticker code so the device can save its config. */
export async function provisionDevice(
	ssid: string,
	pass: string,
	code: string
): Promise<SerialResponse> {
	await sendCommand({ cmd: 'provision', ssid, pass, code });
	const res = await readResponse();
	if (res.status !== 'ok') {
		throw new Error(`Provisioning failed: ${res.reason ?? 'unknown error'}`);
	}
	return res;
}
