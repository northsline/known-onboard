// lib/crypto.ts: client-side device verification using Web Crypto.
//
// The PWA verifies that a Known device is authentic by:
// 1. Checking the device certificate is signed by the Northsline root key
// 2. Challenging the device with a random nonce and verifying the signature
//
// No network calls. No backend. Everything happens in the browser.
import { ROOT_PUBLIC_KEY_JWK } from '$lib/root-key';

// Certificate format (minimal, not full X.509):
// A JSON object: { serial: string, pubKey: string(hex), signature: string(hex) }
// The signature is over (serial || pubKey) using the root private key,
// ECDSA P-256 with SHA-256.
// The cert is DER-encoded as a SEQUENCE for transport, but we parse
// it as a simple fixed-format binary blob here.
export interface DeviceCert {
	serial: string;       // hex, 8 bytes
	pubKey: Uint8Array;   // 65 bytes uncompressed (0x04 || X || Y)
	signature: Uint8Array; // DER-encoded ECDSA signature
}

export interface ChallengeResult {
	serial: string;
	cert: Uint8Array;      // raw certificate bytes (hex-decoded)
	signature: Uint8Array; // DER-encoded ECDSA signature of the nonce
}

/**
 * Generate a cryptographically random 32-byte nonce.
 * Returns hex string for sending over serial.
 */
export function generateNonce(): string {
	const nonce = crypto.getRandomValues(new Uint8Array(32));
	return bytesToHex(nonce);
}

/**
 * Parse the raw certificate bytes returned by the device.
 *
 * Cert layout (binary, fixed format):
 *   [0:8]   serial number (8 bytes)
 *   [8:73]  public key (65 bytes, uncompressed point)
 *   [73:73+sigLen] DER signature (variable, 70-72 bytes)
 *   [73+sigLen:73+sigLen+1] signature length prefix (1 byte)
 *
 * Actually. Simpler: we use a length-prefixed format:
 *   [0:1]   sig length (1 byte)
 *   [1:1+sigLen] DER signature
 *   [1+sigLen:1+sigLen+8] serial (8 bytes)
 *   [1+sigLen+8:1+sigLen+8+65] public key (65 bytes)
 */
export function parseCert(certBytes: Uint8Array): DeviceCert {
	if (certBytes.length < 75) {
		throw new Error('Certificate too short');
	}

	const sigLen = certBytes[0];
	const signature = certBytes.slice(1, 1 + sigLen);
	const serial = certBytes.slice(1 + sigLen, 1 + sigLen + 8);
	const pubKey = certBytes.slice(1 + sigLen + 8, 1 + sigLen + 8 + 65);

	return {
		serial: bytesToHex(serial),
		pubKey: pubKey,
		signature: signature,
	};
}

/**
 * Import the uncompressed public key (65 bytes, 0x04 || X || Y)
 * into a Web Crypto CryptoKey for ECDSA P-256 verification.
 */
async function importUncompressedPublicKey(pubKeyBytes: Uint8Array): Promise<CryptoKey> {
	// Web Crypto expects the key in SPKI format for ECDSA.
	// The SPKI prefix for P-256 uncompressed is 26 bytes:
	// 30 59 30 13 06 07 2a 86 48 ce 3d 02 01
	// 06 08 2a 86 48 ce 3d 03 01 07
	// 03 42 00
	// followed by the 65-byte uncompressed point.
	const spkiPrefix = new Uint8Array([
		0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
		0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
		0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
		0x42, 0x00
	]);

	const spkiKey = new Uint8Array(spkiPrefix.length + pubKeyBytes.length);
	spkiKey.set(spkiPrefix, 0);
	spkiKey.set(pubKeyBytes, spkiPrefix.length);

	return crypto.subtle.importKey(
		'spki',
		spkiKey,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify']
	);
}

/**
 * Convert a DER-encoded ECDSA signature (SEQUENCE of two INTEGERs)
 * to the raw 64-byte format (r || s) that Web Crypto expects for P-256.
 */
export function derToRawSignature(der: Uint8Array): Uint8Array {
	if (der.length < 8 || der[0] !== 0x30) {
		throw new Error('Invalid DER signature');
	}

	let ptr = 2; // skip SEQUENCE tag and length
	const readInt = (): Uint8Array => {
		if (der[ptr] !== 0x02) {
			throw new Error('Expected INTEGER in DER signature');
		}
		ptr++;
		const len = der[ptr++];
		let val = der.slice(ptr, ptr + len);
		ptr += len;
		// Strip leading zero if present (0x00 padding for positive sign bit)
		if (val.length > 32 && val[0] === 0x00) {
			val = val.slice(1);
		}
		if (val.length > 32) {
			throw new Error('DER integer too long for P-256');
		}
		// Left-pad to 32 bytes
		const padded = new Uint8Array(32);
		padded.set(val, 32 - val.length);
		return padded;
	};

	const r = readInt();
	const s = readInt();

	const raw = new Uint8Array(64);
	raw.set(r, 0);
	raw.set(s, 32);
	return raw;
}

/**
 * Verify that a device certificate was signed by the Northsline root key.
 *
 * The signed data is: serial (8 bytes) || public key (65 bytes) = 73 bytes.
 */
export async function verifyCertificate(
	cert: DeviceCert
): Promise<boolean> {
	// Build the signed message: serial || pubKey
	const message = new Uint8Array(8 + 65);
	message.set(hexToBytes(cert.serial), 0);
	message.set(cert.pubKey, 8);

	// Web Crypto expects raw (64-byte) signatures, not DER.
	const rawSig = derToRawSignature(cert.signature);

	// Import root public key
	const rootKey = await crypto.subtle.importKey(
		'jwk',
		ROOT_PUBLIC_KEY_JWK,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify']
	);

	// Verify: ECDSA with SHA-256
	return crypto.subtle.verify(
		{ name: 'ECDSA', hash: 'SHA-256' },
		rootKey,
		rawSig,
		message
	);
}

/**
 * Verify that the device's nonce signature is valid.
 *
 * The device signs the raw nonce (32 bytes) with its private key.
 * We verify against the public key from the certificate.
 */
export async function verifyChallenge(
	nonceHex: string,
	signature: Uint8Array,
	devicePubKey: Uint8Array
): Promise<boolean> {
	const nonce = hexToBytes(nonceHex);

	const key = await importUncompressedPublicKey(devicePubKey);
	const rawSig = derToRawSignature(signature);

	return crypto.subtle.verify(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key,
		rawSig,
		nonce
	);
}

/**
 * Full device authentication flow:
 * 1. Generate nonce
 * 2. Send to device, get back signature + cert
 * 3. Verify cert against root key
 * 4. Verify nonce signature against device public key from cert
 * 5. Return true only if both pass
 */
export async function authenticateDevice(
	challengeFn: (nonce: string) => Promise<ChallengeResult>
): Promise<{ verified: boolean; serial: string | null }> {
	const nonce = generateNonce();
	console.log('[crypto] authenticateDevice: nonce generated, sending challenge');
	const result = await challengeFn(nonce);
	console.log('[crypto] authenticateDevice: challenge response received');
	console.log('[crypto]   serial:', result.serial);
	console.log('[crypto]   cert bytes:', result.cert.length);
	console.log('[crypto]   sig bytes:', result.signature.length);

	// Parse the certificate
	console.log('[crypto] parseCert: parsing', result.cert.length, 'bytes');
	const cert = parseCert(result.cert);
	console.log('[crypto] parseCert: sigLen=', cert.signature.length, 'serial=', cert.serial, 'pubKey=', cert.pubKey.length, 'bytes');

	// Step 1: verify cert is signed by root
	console.log('[crypto] verifyCertificate: checking cert against root key');
	const certValid = await verifyCertificate(cert);
	console.log('[crypto] verifyCertificate: result =', certValid);
	if (!certValid) {
		console.error('[crypto] CERT VERIFICATION FAILED');
		return { verified: false, serial: null };
	}

	// Step 2: verify nonce signature against device public key
	console.log('[crypto] verifyChallenge: checking nonce signature');
	const sigValid = await verifyChallenge(
		nonce,
		result.signature,
		cert.pubKey
	);
	console.log('[crypto] verifyChallenge: result =', sigValid);
	if (!sigValid) {
		console.error('[crypto] NONCE SIGNATURE VERIFICATION FAILED');
		return { verified: false, serial: null };
	}

	console.log('[crypto] authenticateDevice: FULL VERIFICATION PASSED');
	return { verified: true, serial: cert.serial };
}

// --- Utilities ---

export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

export function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}