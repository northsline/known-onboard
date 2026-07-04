export const STORAGE_KEYS = {
	sticker: 'known:sticker'
} as const;

// USB WebSerial provisioning. The PWA talks to the Pico over a
// CDC/ACM serial port at 115200 baud. WebSerial is Chrome/Edge only.
export const SERIAL_BAUD = 115200;

// Raspberry Pi Pico boards (Pico, Pico W, Pico 2, Pico 2 W).
// VID 0x2E8A = Raspberry Pi Ltd. PID 0x0005 = Pico in MicroPython CDC mode.
// Without a filter, Chrome enumerates every Bluetooth device in range,
// the blocklist filters them, and the picker dialog gets overwhelmed.
export const SERIAL_FILTERS: SerialPortFilter[] = [
	{ usbVendorId: 0x2E8A, usbProductId: 0x0005 }
];
