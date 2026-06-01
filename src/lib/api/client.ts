import type { ActivateResult } from '$lib/types';
import { API_BASE_URL } from '$lib/config';

/**
 * Activate a sticker code against the cloud registry. Single-use: the backend
 * marks KNOWN-XXXX-XXXX as claimed and bound to the user. This is the only
 * network call the onboarding PWA makes; everything else happens over serial.
 */
export async function activateSticker(code: string): Promise<ActivateResult> {
	const res = await fetch(`${API_BASE_URL}/activate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sticker_code: code })
	});
	return res.json();
}
