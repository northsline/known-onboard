// English strings, the canonical dictionary. Its shape is the `Dict` type.
// v1 is English-only; add a second locale by satisfying `Dict` and registering
// it in index.ts.

export const en = {
	locale: 'en',

	app: {
		title: 'Set up your Known',
		brand: 'Known',
		brandBy: 'by Northsline'
	},

	onboarding: {
		welcome: 'Set up your Known.',
		hint: 'Setup uses your USB port. Chrome or Edge required.',

		// USB WebSerial provisioning flow
		unsupported:
			'This browser can’t set up Known. Open this page in Chrome or Edge, which support WebSerial.',
		stepConnectTitle: 'Connect your Known',
		stepConnectBody: 'Plug Known into this computer with the USB cable, then connect.',
		connectBtn: 'Connect device',
		connecting: 'Connecting…',
		connectingHint: 'Your Known is rebooting — this can take up to 10 seconds.',
		stepConfirmTitle: 'Activate your device',
		stepConfirmBody: 'We read this code from your Known. Check it matches the sticker, then activate.',
		codeLabel: 'Device code',
		activateBtn: 'Activate',
		activating: 'Activating…',
		stepWifiTitle: 'Add your Wi-Fi',
		stepWifiBody: 'Known joins this network once it’s unplugged from your PC.',
		wifiSsid: 'Network name (SSID)',
		wifiPass: 'Wi-Fi password',
		provisionBtn: 'Provision device',
		provisioning: 'Saving to device…',
		errActivate: 'We couldn’t activate this code. It may already be claimed.',
		errProvision: 'We couldn’t save the settings to your device. Reconnect and try again.',
		errNoCode: 'Your Known didn’t report a code. Reconnect and try again.',
		errSerial:
			'Couldn’t talk to your Known over USB. Close Thonny or any serial monitor, unplug and replug the device, wait for setup mode on the display, then try again.',
		errTimeout:
			'Your Known didn’t respond in time. Make sure it’s plugged in, close any other app using the USB port, and try again.',

		// Success screen
		stepDoneTitle: 'Your device is ready.',
		stepDoneBody: 'Unplug it from your PC and connect it to the wall adapter.',
		downloadLead: 'Download the Known Dashboard:',
		downloadLink: 'github.com/northsline/known-dashboard/releases',
		downloadUrl: 'https://github.com/northsline/known-dashboard/releases',
		availability: 'Your device will be available at known.local or at the IP shown on its display.'
	}
} as const;

export type Dict = typeof en;
