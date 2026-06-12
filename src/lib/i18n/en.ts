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
		welcomeDetail:
			"We'll set up Known over USB. Your browser will ask which port to use — just pick the one that says Raspberry Pi.",
		hint: 'If this button does nothing, try Chrome or Edge.',

		// USB WebSerial provisioning flow
		unsupported: 'This browser cannot set up Known. Try Chrome or Edge.',
		stepConnectTitle: 'Connect your Known',
		stepConnectBody: 'Plug Known into this computer with the USB cable, then hit connect.',
		connectBtn: 'Connect device',
		connecting: 'Connecting…',
		connectingHint: 'Your Known is rebooting — this can take up to 10 seconds.',
		connectHelp:
			"We need to talk to your Known over USB so we can set up Wi-Fi. Nothing leaves your computer.",
		connectHelpList:
			'Try a different USB cable. Try a different USB port. Unplug Known, wait 5 seconds, plug it back in.',
		stepConfirmTitle: 'Activate your device',
		stepConfirmBody:
			"We read this code from your Known. Check it matches the sticker, then activate.",
		codeHint: "This code is on the sticker on the bottom of your Known. We've already read it — double-check it matches.",
		codeLabel: 'Device code',
		codeHelp:
			"If the code doesn't match the sticker, reconnect your Known and try again. The sticker is on the bottom.",
		codeHelpList:
			'Reconnect the device. Check the sticker on the bottom of Known. Try a different USB cable.',
		activateBtn: 'Activate',
		activating: 'Activating…',
		helpOpen: 'What does this do?',
		helpClose: 'Close',
		wifiHelp:
			'Known needs your Wi-Fi name and password to get online. It will remember this network.',
		wifiHelpList:
			'Check your Wi-Fi password. Make sure you are typing the correct network name. Known only works on 2.4 GHz Wi-Fi, not 5 GHz.',
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
		stepDoneDashboard: 'Once it is plugged in, your dashboard is at',
		stepDoneUrl: 'known.local',
		doneHelp:
			'Your dashboard will be at known.local once your Known is plugged into the wall and has finished booting.',
		doneHelpList:
			'Wait 30 seconds after plugging in. Make sure Known is on the same Wi-Fi as your computer. Open known.local in your browser.',
		downloadLead: 'Download the Known Dashboard:',
		downloadLink: 'github.com/northsline/known-dashboard/releases',
		downloadUrl: 'https://github.com/northsline/known-dashboard/releases',
		availability: 'Your device will be available at known.local or at the IP shown on its display.'
	}
} as const;

export type Dict = typeof en;
