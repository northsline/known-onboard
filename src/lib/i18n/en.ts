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
		welcomeDetail: 'We will set up Known using the USB cable. The browser will ask which port to use.',
		hint: "If this does not work, try Chrome or Edge.",

		// USB WebSerial provisioning flow
		unsupported:
			'This browser can not set up Known. Try Chrome or Edge.',
		stepConnectTitle: 'Connect your Known',
		stepConnectBody: 'Plug Known into this computer with the USB cable, then connect.',
		connectBtn: 'Connect device',
		connecting: 'Connecting…',
		connectingHint: 'Your Known is rebooting — this can take up to 10 seconds.',
		connectHelp: 'We need to talk to your Known over USB to set up Wi-Fi. Nothing leaves your computer.',
		stepConfirmTitle: 'Activate your device',
		stepConfirmBody: 'We read this code from your Known. Check it matches the sticker, then activate.',
		codeHint: 'This code is on the sticker on the bottom of your Known. We already read it for you — double-check it matches.',
		codeLabel: 'Device code',
		activateBtn: 'Activate',
		activating: 'Activating…',
		stepWifiTitle: 'Add your Wi-Fi',
		stepWifiBody: 'Known joins this network once it is unplugged from your PC.',
		wifiSsid: 'Network name (SSID)',
		wifiPass: 'Wi-Fi password',
		provisionBtn: 'Provision device',
		provisioning: 'Saving to device…',
		errActivate: 'We could not activate this code. It may already be claimed.',
		errProvision: 'We could not save the settings to your device. Reconnect and try again.',
		errNoCode: 'Your Known did not report a code. Reconnect and try again.',
		errSerial:
			'We could not reach your Known. Unplug it, wait five seconds, plug it back in, and try again.',
		errTimeout:
			'Your Known did not respond. Unplug it, wait a moment, plug it back in, and try again.',

		// Success screen
		stepDoneTitle: 'Your device is ready.',
		stepDoneBody: 'Unplug it from your PC and connect it to the wall adapter.',
		stepDoneDashboard: "Once it is plugged in, your dashboard is at",
		stepDoneUrl: 'known.local',
		downloadLead: 'Download the Known Dashboard:',
		downloadLink: 'github.com/northsline/known-dashboard/releases',
		downloadUrl: 'https://github.com/northsline/known-dashboard/releases',
		availability: 'Your device will be available at known.local or at the IP shown on its display.'
	}
} as const;

export type Dict = typeof en;
