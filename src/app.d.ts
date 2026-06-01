// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {}

	// Custom Vite env vars (see src/lib/config.ts).
	interface ImportMetaEnv {
		readonly VITE_API_BASE_URL?: string;
	}
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}

	// --- Minimal WebSerial API typings (Chrome/Edge only) ---
	// We declare just the surface src/lib/serial.ts uses, so we don't depend on
	// @types/w3c-web-serial. https://wicg.github.io/serial/
	interface SerialPortFilter {
		usbVendorId?: number;
		usbProductId?: number;
	}
	interface SerialPortRequestOptions {
		filters?: SerialPortFilter[];
	}
	interface SerialOptions {
		baudRate: number;
	}
	interface SerialPort {
		open(options: SerialOptions): Promise<void>;
		close(): Promise<void>;
		readonly readable: ReadableStream<Uint8Array> | null;
		readonly writable: WritableStream<Uint8Array> | null;
	}
	interface Serial {
		requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
		getPorts(): Promise<SerialPort[]>;
	}
	interface Navigator {
		readonly serial: Serial;
	}
}

export {};
