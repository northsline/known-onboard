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
		welcome: 'Set up Known.',
		welcomeDetail:
			"Set up Known over USB. Your browser will ask which port to use — pick the one that says Raspberry Pi.",
		hint: 'Nothing happens? Try Chrome or Edge.',
		// USB WebSerial provisioning flow
		unsupported: 'This browser cannot set up Known. Try Chrome (google.com/chrome) or Edge (microsoft.com/edge).',
		stepConnectTitle: 'Connect your Known',
		stepConnectBody: 'Plug Known into this computer, then press Connect.',
		connectBtn: 'Connect device',
		connecting: 'Connecting…',
		connectingHint: 'Known is waking up. This can take up to 10 seconds.',
		connectHelp:
			"Talk to your Known over USB to set up Wi-Fi. Nothing leaves your computer.",
		connectHelpList:
			'Try a different USB cable. Try a different USB port. Unplug Known, wait 5 seconds, plug it back in.',
		stepVerifyTitle: 'Verify your device',
		stepVerifyBody:
			"Known is checking its own identity. No server, no account. The device proves it's real using a key stored on the chip.",
		verifyHint: "This takes a few seconds. The device signs a challenge with its private key.",
		verifyBtn: 'Verify device',
		verifying: 'Verifying…',
		verifyHelp:
			"Known has a unique key burned into its chip at manufacturing. Your browser verifies the signature locally. Nothing is sent to any server.",
		errVerify: 'Could not verify this device. It may not be a genuine Known. Reconnect and try again.',
		errNoKeys: 'This device has no cryptographic keys. It may not be a genuine Known.',
		helpOpen: 'What does this do?',
		helpClose: 'Close',
		wifiHelp:
			'Known needs your Wi-Fi name and password to get online. It remembers this network.',
		wifiHelpList:
			'Check your Wi-Fi password. Make sure you are typing the correct network name. Known only works on 2.4 GHz Wi-Fi, not 5 GHz.',
		stepWifiTitle: 'Add your Wi-Fi',
		stepWifiBody: 'Known joins this network when you unplug it from your PC.',
		wifiSsid: 'Network name (SSID)',
		wifiPass: 'Wi-Fi password',
		provisionBtn: 'Save settings',
		provisioning: 'Saving to device…',
		scanning: 'Scanning for networks…',
		noNetworks: 'No networks found. Try manual entry or rescan.',
		wifiManual: 'Type network name manually',
		wifiPickFromList: 'Pick from list',
		wifiRescan: 'Rescan',
		errProvision: 'Could not save settings to your device. Reconnect and try again.',
		errScan: 'Wi-Fi scan failed. You can still type the network name manually.',
		errSerial:
			'Could not reach your Known. Unplug it. Wait five seconds. Plug it back in. Try again.',
		errTimeout:
			'Your Known did not respond. Unplug it. Wait a moment. Plug it back in. Try again.',

		// Router step
		stepRouterTitle: 'Use Known as your DNS',
		stepRouterBody: 'This step matters: your router needs to send DNS traffic to Known. That is how Known sees your network.',
		knownIp: 'Known IP on your network:',
		routerHint: "Log into your router and find the DNS or DHCP settings. Set the primary DNS server to the IP shown above.",
		routerDoneBtn: 'Done. Unplug Known',
		saving: 'Finishing setup…',
		routerHelp:
			'Known needs to be your network\'s DNS server to monitor traffic. Most routers let you set a custom DNS in the DHCP or WAN settings.',
		routerHelpList:
			'The setup page shows instructions for your router model. If you get stuck, email northsline@protonmail.com. Include your router model.',

		// Success screen
		stepDoneTitle: 'Known is ready.',
		stepDoneBody: 'Unplug it from your PC and connect it to the wall adapter.',
		stepDoneDashboard: 'Open the dashboard at',
		stepDoneUrl: 'known.local',
		doneHelp:
			'Your dashboard is at known.local. Plug Known into the wall. Wait for it to boot.',
		doneHelpList:
			'Wait 30 seconds after plugging in. Make sure Known is on the same Wi-Fi as your computer. Open known.local in your browser.',
		downloadLead: 'Download the Known Dashboard:',
		downloadLink: '[dashboard-url]',
		downloadUrl: '[dashboard-url]',
		availability: 'Your device is at known.local. Or the IP on its display.'
	}
} as const;

export type Dict = typeof en;
