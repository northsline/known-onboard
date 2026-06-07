export const STORAGE_KEYS = {
	sticker: 'known:sticker'
} as const;

// Sticker code format: KNOWN-XXXX-XXXX where X is [A-Z0-9].
export const STICKER_RE = /^KNOWN-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// USB WebSerial provisioning. The PWA talks to the Pico over a
// CDC/ACM serial port at 115200 baud. WebSerial is Chrome/Edge only.
export const SERIAL_BAUD = 115200;

// Raspberry Pi Pico boards (Pico, Pico W, Pico 2, Pico 2 W).
// Empty array = show every serial port in the picker so the device is not hidden.
export const SERIAL_FILTERS: SerialPortFilter[] = [];

// Cloud activation backend (device registry). Overridable per-environment via
// VITE_API_BASE_URL; defaults to the local dev server.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
