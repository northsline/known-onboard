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
	import { CircleHelp, X } from '@lucide/svelte';

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
	let showWifiPass = $state(false);
	let copied = $state(false);

	let codeValid = $derived(STICKER_RE.test(deviceCode.trim().toUpperCase()));

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
				<p class="gate-hint">{t.onboarding.codeHint}</p>
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
					<p class="help-panel">{t.onboarding.codeHelp}<br/><br/>{t.onboarding.codeHelpList}</p>
				{/if}
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
	.field-input.mono {
		letter-spacing: 0.08em;
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

	.gate-error {
		min-height: 18px;
		font-size: 12.5px;
		line-height: 1.4;
		color: oklch(0.8 0.11 25);
	}

	.toggle-pass:focus-visible,
	.help-btn:focus-visible,
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
	.dashboard-link {
		color: var(--paper);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.dashboard-link:hover {
		opacity: 0.82;
	}
</style>
