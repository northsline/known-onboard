<script lang="ts">
	import { t } from '$lib/i18n';
	import { STORAGE_KEYS } from '$lib/config';
	import {
		isSerialSupported,
		connectSerial,
		disconnectSerial,
		identifyDevice,
		challengeDevice,
		provisionDevice,
		scanNetworks,
		routerInfo,
		type WifiNetwork
	} from '$lib/serial';
	import { authenticateDevice } from '$lib/crypto';
	import { base } from '$app/paths';
	import { CircleHelp, X } from '@lucide/svelte';

	// USB WebSerial provisioning:
	//   connect -> verify (local crypto) -> wifi -> provision (serial) -> router -> done
	type Step = 'connect' | 'verify' | 'wifi' | 'router' | 'done';
	let step = $state<Step>('connect');

	let supported = isSerialSupported();
	let busy = $state(false);
	let error = $state('');
	let showHelp = $state(false);

	let deviceSerial = $state('');
	let ssid = $state('');
	let wifiPass = $state('');
	let showWifiPass = $state(false);
	let copied = $state(false);

	let networks = $state<WifiNetwork[]>([]);
	let scanBusy = $state(false);
	let manualSsid = $state(false);

	let routerBssid = $state('');
	let routerIp = $state('');
	let routerVendor = $state('');

	let verifyError = $state('');

	async function copyUrl() {
		try {
			await navigator.clipboard.writeText('known.local');
			copied = true;
			setTimeout(() => copied = false, 2000);
		} catch {
			// clipboard not available
		}
	}

	async function handleConnect() {
		error = '';
		busy = true;
		try {
			await connectSerial();
			const id = await identifyDevice();
			if (id.serial) {
				deviceSerial = id.serial;
			}
			if (!id.has_keys) {
				error = t.onboarding.errNoKeys;
				await disconnectSerial();
				return;
			}
			step = 'verify';
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('bad_json')) error = t.onboarding.errSerial;
			else if (msg.includes('Timed out')) error = t.onboarding.errTimeout;
			else error = t.onboarding.errSerial;
			await disconnectSerial();
		} finally {
			busy = false;
		}
	}

	async function handleVerify() {
		error = '';
		verifyError = '';
		busy = true;
		try {
			console.log('[ui] handleVerify: starting authentication');
			const result = await authenticateDevice(async (nonce) => {
				console.log('[ui] handleVerify: sending challenge with nonce', nonce.slice(0, 16) + '...');
				const r = await challengeDevice(nonce);
				console.log('[ui] handleVerify: challenge response received, cert hex length:', r.cert.length, 'sig hex length:', r.signature.length);
				return {
					serial: r.serial,
					cert: hexToBytes(r.cert),
					signature: hexToBytes(r.signature)
				};
			});

			console.log('[ui] handleVerify: authenticateDevice returned, verified:', result.verified);
			if (!result.verified) {
				error = t.onboarding.errVerify;
				await disconnectSerial();
				step = 'connect';
				return;
			}

			deviceSerial = result.serial ?? '';
			step = 'wifi';
			loadNetworks();
			} catch (e) {
			error = e instanceof Error ? e.message : t.onboarding.errVerify;
			await disconnectSerial();
			step = 'connect';
			} finally {
			busy = false;
		}
	}

	function hexToBytes(hex: string): Uint8Array {
		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < hex.length; i += 2) {
			bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
		}
		return bytes;
	}

	async function loadNetworks() {
		scanBusy = true;
		error = '';
		try {
			const nets = await scanNetworks();
			// sort by signal strength (strongest first)
			networks = nets.sort((a, b) => b.rssi - a.rssi);
			if (networks.length > 0 && !ssid) {
				ssid = networks[0].ssid;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : t.onboarding.errScan;
		} finally {
			scanBusy = false;
		}
	}

	function ouiLookup(bssid: string): string {
		if (!bssid) return '';
		const prefix = bssid.slice(0, 8).toUpperCase();
		const map: Record<string, string> = {
			'00:1A:2B': 'AVM (Fritz!Box)',
			'A4:91:B1': 'AVM (Fritz!Box)',
			'E4:F0:42': 'AVM (Fritz!Box)',
			'C4:ED:BA': 'AVM (Fritz!Box)',
			'00:14:22': 'Linksys / Cisco',
			'00:1E:C7': 'Linksys / Cisco',
			'00:24:D4': 'Linksys / Cisco',
			'00:26:5A': 'Netgear',
			'C0:C1:C0': 'Netgear',
			'AC:9B:0A': 'Netgear',
			'28:80:88': 'Netgear',
			'00:12:BF': 'TP-Link',
			'78:8A:20': 'TP-Link',
			'3C:37:86': 'TP-Link',
			'50:D4:F7': 'TP-Link',
			'00:1D:0F': 'D-Link',
			'00:24:A5': 'D-Link',
			'00:26:75': 'D-Link',
			'00:50:7F': 'Asus',
			'00:18:4D': 'Asus',
			'00:1C:A2': 'Asus',
			'04:D4:C4': 'Asus',
			'00:1B:11': 'Belkin',
			'00:24:89': 'Belkin',
			'00:26:CE': 'Belkin',
			'00:15:0C': 'ZyXEL',
			'00:22:6B': 'ZyXEL',
			'00:25:9C': 'ZyXEL',
			'00:08:5B': 'Motorola',
			'00:14:95': 'Motorola',
			'00:1B:57': 'Motorola',
			'00:0C:41': 'Ubiquiti',
			'00:18:E7': 'Ubiquiti',
			'00:1E:58': 'Ubiquiti',
			'B0:95:75': 'Huawei',
			'00:E0:4C': 'Huawei',
			'00:1F:A4': 'Apple / AirPort',
			'00:24:36': 'Apple / AirPort',
			'00:26:08': 'Apple / AirPort',
			'04:0C:CE': 'Xiaomi',
			'64:69:4E': 'Xiaomi',
			'AC:C1:EE': 'Xiaomi',
		};
		return map[prefix] || '';
	}

	function dnsInstructions(vendor: string, knownIp: string): string {
		if (!knownIp) knownIp = '192.168.1.42';
		switch (vendor) {
			case 'AVM (Fritz!Box)':
				return `Open fritz.box in your browser. Go to Internet → Account Information → DNS Server. Set the DNSv4 server to ${knownIp}. Save and apply.`;
			case 'TP-Link':
				return `Open tplinkwifi.net or 192.168.0.1. Go to Advanced → Network → DHCP Server. Set Primary DNS to ${knownIp}. Save.`;
			case 'Netgear':
				return `Open routerlogin.net or 192.168.1.1. Go to Advanced → Setup → WAN Setup. Set DNS Address to ${knownIp}. Apply.`;
			case 'Asus':
				return `Open router.asus.com. Go to WAN → Internet Connection → WAN DNS Setting. Set DNS Server 1 to ${knownIp}. Apply.`;
			case 'Linksys / Cisco':
				return `Open 192.168.1.1. Go to Connectivity → Local Network. Set Static DNS 1 to ${knownIp}. Save.`;
			case 'Apple / AirPort':
				return `Open AirPort Utility, select your base station, click Edit. Go to Internet → DNS Servers and add ${knownIp}. Update.`;
			case 'Huawei':
				return `Open 192.168.3.1 or 192.168.1.1. Go to DHCP or LAN settings. Set DNS server to ${knownIp}. Save.`;
			case 'Xiaomi':
				return `Open 192.168.31.1 or miwifi.com. Go to Settings → LAN Settings → DHCP. Set DNS to ${knownIp}. Save.`;
			default:
				return `Log into your router (usually 192.168.1.1 or 192.168.0.1). Find the DHCP or DNS settings page and set the primary DNS server to ${knownIp}. Save and restart your router if needed.`;
		}
	}

	async function handleProvision(e: SubmitEvent) {
		e.preventDefault();
		if (!ssid.trim()) return;
		error = '';
		busy = true;
		try {
			await provisionDevice(ssid.trim(), wifiPass);
			// Don't disconnect yet — we need serial for router_info
			step = 'router';
			// fetch router info while still on USB
			const info = await routerInfo();
			routerBssid = info.bssid;
			routerIp = info.ip;
			routerVendor = ouiLookup(info.bssid);
		} catch (e) {
			error = e instanceof Error ? e.message : t.onboarding.errProvision;
		} finally {
			busy = false;
		}
	}

	async function handleRouterDone() {
		busy = true;
		try {
			await disconnectSerial();
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEYS.sticker, deviceSerial);
			}
			step = 'done';
		} catch (e) {
			error = e instanceof Error ? e.message : t.onboarding.errSerial;
		} finally {
			busy = false;
		}
	}
</script>

<div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
	<div class="gate-grain" aria-hidden="true"></div>

	<div class="gate-inner">
		<img src="{base}/favicon.png" alt="" class="gate-mark" aria-hidden="true" />

		{#if !supported}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.welcome}</h1>
				<p class="gate-sub">{t.onboarding.welcomeDetail}</p>
				<p class="gate-sub">{t.onboarding.unsupported}</p>
			</div>
		{:else if step === 'connect'}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepConnectTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepConnectBody}</p>
			</div>
			<div class="panel">
				<button class="gate-submit" onclick={handleConnect} disabled={busy}>
					{busy ? t.onboarding.connecting : t.onboarding.connectBtn}
				</button>
				{#if busy}
					<p class="gate-hint">{t.onboarding.connectingHint}</p>
				{/if}
				<p class="gate-error" role="alert" aria-live="assertive">{error}</p>
				<p class="gate-hint">{t.onboarding.hint}</p>
				<p class="gate-help">
					<button type="button" class="help-btn" onclick={() => showHelp = !showHelp}>
						{#if showHelp}
							<X size={18} />
						{:else}
							<CircleHelp size={18} />
						{/if}
						{showHelp ? t.onboarding.helpClose : t.onboarding.helpOpen}
					</button>
				</p>
				{#if showHelp}
					<p class="help-panel">{t.onboarding.connectHelp}</p>
				{/if}
			</div>
		{:else if step === 'verify'}
		<div class="gate-head">
			<h1 class="gate-title" id="gate-title">{t.onboarding.stepVerifyTitle}</h1>
			<p class="gate-sub">{t.onboarding.stepVerifyBody}</p>
		</div>
		<div class="panel">
			<p class="gate-hint mono">{deviceSerial || '—'}</p>
			<p class="gate-hint">{t.onboarding.verifyHint}</p>
			<p class="gate-help">
				<button type="button" class="help-btn" onclick={() => showHelp = !showHelp}>
					{#if showHelp}
						<X size={18} />
					{:else}
						<CircleHelp size={18} />
					{/if}
					{showHelp ? t.onboarding.helpClose : t.onboarding.helpOpen}
				</button>
			</p>
			{#if showHelp}
				<p class="help-panel">{t.onboarding.verifyHelp}</p>
			{/if}
			<button class="gate-submit" onclick={handleVerify} disabled={busy}>
				{busy ? t.onboarding.verifying : t.onboarding.verifyBtn}
			</button>
			<p class="gate-error" role="alert" aria-live="assertive">{error}</p>
		</div>
		{:else if step === 'wifi'}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepWifiTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepWifiBody}</p>
			</div>
			<form class="panel" onsubmit={handleProvision}>
				{#if !manualSsid}
					<label class="field">
						<span class="field-label">{t.onboarding.wifiSsid}</span>
						{#if scanBusy}
							<p class="gate-hint">{t.onboarding.scanning}</p>
						{:else if networks.length === 0}
							<p class="gate-hint">{t.onboarding.noNetworks}</p>
						{:else}
							<select class="field-input" bind:value={ssid} required>
								{#each networks as net (net.bssid)}
									<option value={net.ssid}>
										{net.ssid}
										{#if net.rssi > -50}
											 (strong)
										{:else if net.rssi > -70}
											 (fair)
										{:else}
											 (weak)
										{/if}
									</option>
								{/each}
							</select>
						{/if}
					</label>
					<p class="gate-hint">
						<button type="button" class="text-btn" onclick={() => manualSsid = true}>
							{t.onboarding.wifiManual}
						</button>
						{#if !scanBusy && networks.length === 0}
							<span class="sep">·</span>
							<button type="button" class="text-btn" onclick={loadNetworks}>
								{t.onboarding.wifiRescan}
							</button>
						{/if}
					</p>
				{:else}
					<label class="field">
						<span class="field-label">{t.onboarding.wifiSsid}</span>
						<input class="field-input" type="text" bind:value={ssid} autocomplete="off" required />
					</label>
					<p class="gate-hint">
						<button type="button" class="text-btn" onclick={() => manualSsid = false}>
							{t.onboarding.wifiPickFromList}
						</button>
					</p>
				{/if}
				<label class="field">
					<span class="field-label">{t.onboarding.wifiPass}</span>
					<div class="password-row">
						<input class="field-input" type={showWifiPass ? 'text' : 'password'} bind:value={wifiPass} autocomplete="off" />
						<button type="button" class="toggle-pass" onclick={() => showWifiPass = !showWifiPass}>
							{showWifiPass ? 'Hide' : 'Show'}
						</button>
					</div>
				</label>
				<button class="gate-submit" type="submit" disabled={busy || !ssid.trim()}>
					{busy ? t.onboarding.provisioning : t.onboarding.provisionBtn}
				</button>
				<p class="gate-help">
					<button type="button" class="help-btn" onclick={() => showHelp = !showHelp}>
						{#if showHelp}
							<X size={18} />
						{:else}
							<CircleHelp size={18} />
						{/if}
						{showHelp ? t.onboarding.helpClose : t.onboarding.helpOpen}
					</button>
				</p>
				{#if showHelp}
					<p class="help-panel">{t.onboarding.wifiHelp}<br/><br/>{t.onboarding.wifiHelpList}</p>
				{/if}
				<p class="gate-error" role="alert" aria-live="assertive">{error}</p>
			</form>
		{:else if step === 'router'}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepRouterTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepRouterBody}</p>
			</div>
			<div class="panel">
				{#if routerVendor}
					<p class="router-badge">{routerVendor}</p>
				{/if}
				<p class="router-ip">{t.onboarding.knownIp} <span class="mono">{routerIp || '—'}</span></p>
				<div class="router-instructions">
					<p>{dnsInstructions(routerVendor, routerIp)}</p>
				</div>
				<p class="gate-hint">{t.onboarding.routerHint}</p>
				<button class="gate-submit" onclick={handleRouterDone} disabled={busy}>
					{busy ? t.onboarding.saving : t.onboarding.routerDoneBtn}
				</button>
				<p class="gate-help">
					<button type="button" class="help-btn" onclick={() => showHelp = !showHelp}>
						{#if showHelp}
							<X size={18} />
						{:else}
							<CircleHelp size={18} />
						{/if}
						{showHelp ? t.onboarding.helpClose : t.onboarding.helpOpen}
					</button>
				</p>
				{#if showHelp}
					<p class="help-panel">{t.onboarding.routerHelp}<br/><br/>{t.onboarding.routerHelpList}</p>
				{/if}
				<p class="gate-error" role="alert" aria-live="assertive">{error}</p>
			</div>
		{:else}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepDoneTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepDoneBody}</p>
				<p class="gate-sub dashboard-hint">
					{t.onboarding.stepDoneDashboard}
					<button type="button" class="copy-url-btn" onclick={copyUrl}>
						{t.onboarding.stepDoneUrl}
					</button>
					{#if copied}
						<span class="copied-msg">Copied!</span>
					{/if}
				</p>
			</div>
			<div class="panel done-panel">
				<p class="done-line">
					{t.onboarding.downloadLead}<br />
					<a class="done-link" href={t.onboarding.downloadUrl} target="_blank" rel="noopener noreferrer">
						{t.onboarding.downloadLink}
					</a>
				</p>
				<p class="done-availability">{t.onboarding.availability}</p>
				<p class="gate-help">
					<button type="button" class="help-btn" onclick={() => showHelp = !showHelp}>
						{#if showHelp}
							<X size={18} />
						{:else}
							<CircleHelp size={18} />
						{/if}
						{showHelp ? t.onboarding.helpClose : t.onboarding.helpOpen}
					</button>
				</p>
				{#if showHelp}
					<p class="help-panel">{t.onboarding.doneHelp}<br/><br/>{t.onboarding.doneHelpList}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.gate {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		padding: 32px;
		background: var(--charcoal);
		color: var(--paper);
		overflow: hidden;
		animation: gateIn 0.6s var(--ease-out) both;
	}
	@keyframes gateIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.gate-grain {
		position: absolute;
		inset: 0;
		background: radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.05), transparent 60%);
		pointer-events: none;
	}

	.gate-inner {
		position: relative;
		width: 100%;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 28px;
		text-align: center;
	}

	.gate-mark {
		width: 52px;
		height: 52px;
		border-radius: 14px;
		display: block;
	}

	.gate-head {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.gate-title {
		font-family: 'Instrument Sans', sans-serif;
		font-weight: 500;
		font-size: clamp(28px, 5vw, 36px);
		letter-spacing: -0.03em;
		line-height: 1.05;
		color: var(--paper);
	}
	.gate-sub {
		font-size: 15px;
		line-height: 1.5;
		color: var(--paper-soft);
	}

	.panel {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 14px;
		width: 100%;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 7px;
		text-align: left;
	}
	.field-label {
		font-size: 12.5px;
		color: var(--paper-soft);
	}
	.field-input {
		height: 48px;
		padding: 0 14px;
		color: var(--paper);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: var(--r-sm);
		outline: none;
		font-size: 15px;
		transition:
			border-color 0.18s var(--ease),
			background 0.18s var(--ease),
			box-shadow 0.18s var(--ease);
	}
	.field-input:focus {
		border-color: var(--paper-soft);
		background: rgba(255, 255, 255, 0.09);
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08);
	}
	select.field-input {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 14px center;
		padding-right: 36px;
	}
	.password-row {
		display: flex;
		gap: 8px;
	}
	.password-row .field-input {
		flex: 1;
	}
	.toggle-pass {
		height: 48px;
		padding: 0 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: var(--r-sm);
		color: var(--paper-soft);
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
	}
	.toggle-pass:hover {
		background: rgba(255, 255, 255, 0.09);
	}

	.text-btn {
		background: none;
		border: none;
		color: var(--paper-mute);
		font-size: 12.5px;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.text-btn:hover {
		color: var(--paper-soft);
	}
	.sep {
		color: var(--paper-mute);
		margin: 0 6px;
	}

	.gate-error {
		min-height: 18px;
		font-size: 12.5px;
		line-height: 1.4;
		color: oklch(0.8 0.11 25);
	}

	.toggle-pass:focus-visible,
	.help-btn:focus-visible,
	.text-btn:focus-visible,
	.copy-url-btn:focus-visible,
	.gate-submit:focus-visible {
		outline: 2px solid var(--paper-soft);
		outline-offset: 2px;
	}

	.gate-sub {
		color: var(--paper-soft);
	}

	.gate-submit {
		width: 100%;
		height: 48px;
		border-radius: var(--r-sm);
		background: var(--paper);
		color: var(--ink);
		font-weight: 600;
		font-size: 15px;
		letter-spacing: -0.01em;
		transition:
			opacity 0.2s var(--ease),
			transform 0.15s var(--ease);
	}
	.gate-submit:hover {
		opacity: 0.88;
	}
	.gate-submit:active {
		transform: scale(0.99);
	}
	.gate-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.gate-hint {
		font-size: 12px;
		line-height: 1.5;
		color: var(--paper-mute);
	}
	.gate-help {
		display: flex;
		justify-content: center;
	}
	.help-btn {
		display: flex;
		align-items: center;
		background: none;
		border: none;
		color: var(--paper-soft);
		font-size: 14px;
		cursor: pointer;
		padding: 6px 10px;
		border-radius: var(--r-sm);
		opacity: 0.8;
		gap: 6px;
	}
	.help-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.05);
	}
	.help-panel {
		font-size: 12px;
		line-height: 1.5;
		color: var(--paper-soft);
		background: rgba(255, 255, 255, 0.05);
		padding: 10px 12px;
		border-radius: var(--r-sm);
		margin-top: 4px;
	}

	/* Router step */
	.router-badge {
		font-size: 13px;
		color: var(--paper);
		background: rgba(255, 255, 255, 0.08);
		padding: 6px 12px;
		border-radius: var(--r-pill);
		display: inline-block;
		align-self: center;
	}
	.router-ip {
		font-size: 14px;
		color: var(--paper-soft);
	}
	.router-ip .mono {
		font-family: 'Space Mono', monospace;
		letter-spacing: 0.02em;
		color: var(--paper);
	}
	.router-instructions {
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--paper-soft);
		background: rgba(255, 255, 255, 0.05);
		padding: 12px 14px;
		border-radius: var(--r-sm);
		text-align: left;
	}

	.done-panel {
		gap: 20px;
	}
	.done-line {
		font-size: 14px;
		line-height: 1.6;
		color: var(--paper-soft);
	}
	.done-link {
		color: var(--paper);
		text-decoration: underline;
		text-underline-offset: 3px;
		word-break: break-all;
	}
	.done-link:hover {
		opacity: 0.82;
	}
	.done-availability {
		font-size: 13px;
		line-height: 1.5;
		color: var(--paper-mute);
	}
	.dashboard-hint {
		margin-top: 8px;
	}
	.copy-url-btn {
		background: none;
		border: none;
		color: var(--paper);
		font-size: inherit;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		padding: 0;
	}
	.copy-url-btn:hover {
		opacity: 0.82;
	}
	.copied-msg {
		margin-left: 8px;
		font-size: 12px;
		color: oklch(0.55 0.14 145);
	}
</style>
