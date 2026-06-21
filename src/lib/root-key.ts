// lib/root-key.ts — Northsline root public key (embedded in the PWA)
//
// This is the PUBLIC key — it can be shared openly. It's used to verify
// that a device certificate was signed by Northsline's root private key
// (which never leaves the manufacturing machine).
//
// Format: JWK (JSON Web Key) for Web Crypto SubtleCrypto.importKey
//
// This key is generated once by manufacturing/keygen.py and embedded here.
// If the root key is ever rotated, this file gets updated and the PWA
// is re-deployed. Old devices still verify — their certs were signed
// by the old key, and you'd need to ship both keys during transition.
//
// PLACEHOLDER: This key will be replaced by the real root public key
// when you run manufacturing/keygen.py for the first time.
// The keygen script will output the JWK to paste here.

export const ROOT_PUBLIC_KEY_JWK: JsonWebKey = {
	kty: 'EC',
	crv: 'P-256',
	x: 'mRq6R6voBrIXRvzrm1JzdMVp0M14-_AiXsZxhAn0udQ',
	y: 'wMwnsWEAm37eWTZe-QgurPnTZOlQZ9-hp_4MGSLO5EM',
	ext: true,
};