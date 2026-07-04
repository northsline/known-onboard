// WebSerial provisioning client.
//
// Talks to the Pico over a USB CDC/ACM serial port using a line-delimited JSON
// protocol (see lib/provisioning.py on the firmware side).
import { SERIAL_BAUD, SERIAL_FILTERS } from '$lib/config';

export interface IdentifyResult {
	serial: string | null;
	has_keys: boolean;
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
let readLoopPromise: Promise<void> | null = null;
let keepReading = false;

const encoder = new TextEncoder();
let decoder = new TextDecoder();

const BOOT_DELAY_MS = 3500;
const IDENTIFY_TIMEOUT_MS = 25000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSerialSupported(): boolean {
	return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Background read loop: push every byte from the port into rxBuffer.
 *  WebSerial readers only allow one concurrent read(), so this single loop
 *  owns the reader and line parsing polls the buffer instead of racing reads.
 */
async function readLoop(): Promise<void> {
	while (keepReading && reader) {
		try {
			const { value, done } = await reader.read();
			if (done) {
				console.log('[serial] readLoop: stream done');
				break;
			}
			if (value && value.length > 0) {
				rxBuffer += decoder.decode(value, { stream: true });
			}
		} catch (e) {
			console.log('[serial] readLoop: error:', e);
			break;
		}
	}
}

/** Read one line, waiting up to timeoutMs. Keeps partial data in rxBuffer. */
async function readLine(timeoutMs: number): Promise<string | null> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const nl = rxBuffer.indexOf('\n');
		if (nl >= 0) {
			const line = rxBuffer.slice(0, nl).replace(/\r$/, '').trim();
			rxBuffer = rxBuffer.slice(nl + 1);
			if (line) return line;
			continue;
		}
		await sleep(50);
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

/** Wait for boot + firmware ready beacon after the port open reboots the Pico.
 *  Throws if the ready beacon is not seen in time so the caller can reconnect.
 */
async function waitForDeviceReady(): Promise<void> {
	console.log('[serial] waitForDeviceReady: sleeping BOOT_DELAY_MS=' + BOOT_DELAY_MS);
	await sleep(BOOT_DELAY_MS);
	console.log('[serial] waitForDeviceReady: now listening for ready beacon (12s timeout)');

	const deadline = Date.now() + 12000;
	let bytesRead = 0;
	while (Date.now() < deadline) {
		const remaining = Math.min(500, deadline - Date.now());
		if (remaining <= 0) break;
		const line = await readLine(remaining);
		if (!line) {
			// No newline yet. Check if any bytes at all are arriving.
			if (rxBuffer.length > bytesRead) {
				bytesRead = rxBuffer.length;
				console.log('[serial] waitForDeviceReady: bytes arriving, buffer=', JSON.stringify(rxBuffer.slice(-40)));
			}
			continue;
		}
		console.log('[serial] waitForDeviceReady: got line:', line);
		const res = parseResponse(line);
		if (res?.status === 'ready') {
			console.log('[serial] waitForDeviceReady: ready beacon found');
			return;
		}
		if (line.includes('Waiting for USB setup')) {
			console.log('[serial] waitForDeviceReady: found waiting text');
			return;
		}
	}
	console.error('[serial] waitForDeviceReady: TIMED OUT after 12s, no ready beacon');
	throw new Error('The device did not become ready over USB. Unplug it and try again.');
}

export async function connectSerial(): Promise<void> {
	if (!isSerialSupported()) {
		throw new Error('WebSerial is not supported. Use Chrome or Edge to set up your Known.');
	}

	console.log('[serial] connectSerial: requesting port');
	port = await navigator.serial.requestPort({ filters: SERIAL_FILTERS });
	console.log('[serial] connectSerial: opening port at ' + SERIAL_BAUD);
	await port.open({ baudRate: SERIAL_BAUD });
	console.log('[serial] connectSerial: port opened');

	if (!port.readable || !port.writable) {
		throw new Error('Serial port opened without read/write streams.');
	}

	reader = port.readable.getReader();
	writer = port.writable.getWriter();
	rxBuffer = '';
	decoder = new TextDecoder();
	keepReading = true;
	readLoopPromise = readLoop();

	console.log('[serial] connectSerial: calling waitForDeviceReady');
	await waitForDeviceReady();
	console.log('[serial] connectSerial: ready, proceeding');
}

export async function disconnectSerial(): Promise<void> {
	console.log('[serial] disconnectSerial: closing');
	keepReading = false;
	try {
		await reader?.cancel();
	} catch {
		// ignore
	}
	try {
		await readLoopPromise;
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
	decoder = new TextDecoder();
	readLoopPromise = null;
}

export async function sendCommand(cmd: object): Promise<void> {
	if (!writer) throw new Error('Serial port is not open.');
	await writer.write(encoder.encode(JSON.stringify(cmd) + '\n'));
}

/** Read until a JSON response with a status field arrives (skips boot text). */
export async function readResponse(timeoutMs = 8000): Promise<SerialResponse> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const remaining = Math.max(deadline - Date.now(), 50);
		const line = await readLine(remaining);
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
		console.log('[serial] identifyDevice: sending identify command');
		await sendCommand({ cmd: 'identify' });

		try {
			const res = await readResponse(4000);
			console.log('[serial] identifyDevice: got response:', JSON.stringify(res));
			if (res.status === 'ok') {
				return {
					serial: (res.serial as string) ?? null,
					has_keys: (res.has_keys as boolean) ?? false
				};
			}
			lastReason = res.reason ?? 'unknown error';
			if (res.reason !== 'bad_json') break;
		} catch (e) {
			console.log('[serial] identifyDevice: readResponse threw:', e);
		}

		await sleep(800);
	}

	throw new Error(`Device identify failed: ${lastReason}`);
}

export interface ChallengeResult {
	serial: string;
	cert: string;       // hex-encoded certificate bytes
	signature: string;  // hex-encoded DER signature
}

export async function challengeDevice(nonceHex: string): Promise<ChallengeResult> {
	await sendCommand({ cmd: 'challenge', nonce: nonceHex });
	const res = await readResponse(30000); // signing takes 2-5s on RP2350
	if (res.status !== 'ok') {
		throw new Error(`Challenge failed: ${res.reason ?? 'unknown error'}`);
	}
	return {
		serial: (res.serial as string) ?? '',
		cert: (res.cert as string) ?? '',
		signature: (res.signature as string) ?? ''
	};
}

export async function provisionDevice(
	ssid: string,
	pass: string
): Promise<SerialResponse> {
	await sendCommand({ cmd: 'provision', ssid, pass });
	const res = await readResponse(15000);
	if (res.status !== 'ok') {
		throw new Error(`Provisioning failed: ${res.reason ?? 'unknown error'}`);
	}
	return res;
}

export interface WifiNetwork {
	ssid: string;
	bssid: string;
	channel: number;
	rssi: number;
	hidden: boolean;
}

export async function scanNetworks(): Promise<WifiNetwork[]> {
	await sendCommand({ cmd: 'scan' });
	const res = await readResponse(10000);
	if (res.status !== 'ok') {
		throw new Error(`WiFi scan failed: ${res.reason ?? 'unknown error'}`);
	}
	return (res.networks as WifiNetwork[]) ?? [];
}

export interface RouterInfo {
	bssid: string;
	ip: string;
}

export async function routerInfo(): Promise<RouterInfo> {
	await sendCommand({ cmd: 'router_info' });
	const res = await readResponse(8000);
	if (res.status !== 'ok') {
		throw new Error(`Router info failed: ${res.reason ?? 'unknown error'}`);
	}
	return {
		bssid: (res.bssid as string) ?? '',
		ip: (res.ip as string) ?? ''
	};
}
