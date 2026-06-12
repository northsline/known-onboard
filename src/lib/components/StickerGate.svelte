<script lang="ts">
	import { t } from '$lib/i18n';
	import { STICKER_RE, STORAGE_KEYS } from '$lib/config';
	import {
		isSerialSupported,
		connectSerial,
		disconnectSerial,
		identifyDevice,
		provisionDevice
	} from '$lib/serial';
	import { activateSticker } from '$lib/api/client';
	import { base } from '$app/paths';

	// USB WebSerial provisioning:
	//   connect -> activate (cloud) -> wifi -> provision (serial) -> done
	type Step = 'connect' | 'confirm' | 'wifi' | 'done';
	let step = $state<Step>('connect');

	let supported = isSerialSupported();
	let busy = $state(false);
	let error = $state('');
	let showHelp = $state(false);

	let deviceCode = $state('');
	let ssid = $state('');
	let wifiPass = $state('');

	let codeValid = $derived(STICKER_RE.test(deviceCode.trim().toUpperCase()));

	async function handleConnect() {
		error = '';
		busy = true;
		try {
			await connectSerial();
			const id = await identifyDevice();
			if (id.code) {
				deviceCode = id.code;
			}
			step = 'confirm';
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('bad_json')) error = t.onboarding.errSerial;
			else if (msg.includes('Timed out')) error = t.onboarding.errTimeout;
			else error = msg;
			await disconnectSerial();
		} finally {
			busy = false;
		}
	}

	async function handleActivate() {
		const code = deviceCode.trim().toUpperCase();
		if (!STICKER_RE.test(code)) {
			error = t.onboarding.errNoCode;
			return;
		}
		error = '';
		busy = true;
		try {
			const result = await activateSticker(code);
			if (result.status !== 'ok') {
				error = t.onboarding.errActivate;
				return;
			}
			deviceCode = code;
			step = 'wifi';
		} catch (e) {
			error = e instanceof Error ? e.message : t.onboarding.errActivate;
		} finally {
			busy = false;
		}
	}

	async function handleProvision(e: SubmitEvent) {
		e.preventDefault();
		if (!ssid.trim()) return;
		error = '';
		busy = true;
		try {
			await provisionDevice(ssid.trim(), wifiPass, deviceCode);
			await disconnectSerial();
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEYS.sticker, deviceCode);
			}
			step = 'done';
		} catch (e) {
			error = e instanceof Error ? e.message : t.onboarding.errProvision;
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
						<span class="help-icon">{showHelp ? 'x' : 'i'}</span> {showHelp ? 'Close' : 'What does this do?'}
					</button>
				</p>
				{#if showHelp}
					<p class="help-panel">{t.onboarding.connectHelp}</p>
				{/if}
			</div>
		{:else if step === 'confirm'}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepConfirmTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepConfirmBody}</p>
			</div>
			<div class="panel">
				<label class="field">
					<span class="field-label">{t.onboarding.codeLabel}</span>
					<input
						class="field-input mono"
						type="text"
						bind:value={deviceCode}
						placeholder="KNOWN-XXXX-XXXX"
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
					/>
				</label>
				<button class="gate-submit" onclick={handleActivate} disabled={busy || !codeValid}>
					{busy ? t.onboarding.activating : t.onboarding.activateBtn}
				</button>
				<p class="gate-error" role="alert" aria-live="assertive">{error}</p>
			</div>
		{:else if step === 'wifi'}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepWifiTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepWifiBody}</p>
			</div>
			<form class="panel" onsubmit={handleProvision}>
				<label class="field">
					<span class="field-label">{t.onboarding.wifiSsid}</span>
					<input class="field-input" type="text" bind:value={ssid} autocomplete="off" required />
				</label>
				<label class="field">
					<span class="field-label">{t.onboarding.wifiPass}</span>
					<input class="field-input" type="password" bind:value={wifiPass} autocomplete="off" />
				</label>
				<button class="gate-submit" type="submit" disabled={busy || !ssid.trim()}>
					{busy ? t.onboarding.provisioning : t.onboarding.provisionBtn}
				</button>
				<p class="gate-error" role="alert" aria-live="assertive">{error}</p>
			</form>
		{:else}
			<div class="gate-head">
				<h1 class="gate-title" id="gate-title">{t.onboarding.stepDoneTitle}</h1>
				<p class="gate-sub">{t.onboarding.stepDoneBody}</p>
				<p class="gate-sub dashboard-hint">
					{t.onboarding.stepDoneDashboard} <a href="http://known.local:8080" class="dashboard-link">{t.onboarding.stepDoneUrl}</a>
				</p>
			</div>
			<div class="panel done-panel">
				<p class="done-line">
					{t.onboarding.downloadLead}<br />
					<a class="done-link" href={t.onboarding.downloadUrl} target="_blank" rel="noreferrer">
						{t.onboarding.downloadLink}
					</a>
				</p>
				<p class="done-availability">{t.onboarding.availability}</p>
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
	.field-input.mono {
		letter-spacing: 0.08em;
	}

	.gate-error {
		min-height: 18px;
		font-size: 12.5px;
		line-height: 1.4;
		color: oklch(0.74 0.13 25);
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
		background: none;
		border: none;
		color: var(--paper-soft);
		font-size: 12px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--r-sm);
		text-decoration: underline;
		text-underline-offset: 2px;
		opacity: 0.8;
	}
	.help-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.05);
	}
	.help-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: 10px;
		font-style: italic;
		margin-right: 4px;
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
	.dashboard-link {
		color: var(--paper);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.dashboard-link:hover {
		opacity: 0.82;
	}
</style>
