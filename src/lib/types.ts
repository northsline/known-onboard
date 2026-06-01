// Onboarding domain types.
//
// The provisioning flow is small: it reads a sticker code off the device,
// claims it in the cloud registry, and writes Wi-Fi credentials back over
// serial. The serial protocol shapes live in serial.ts; the cloud response
// shape lives here.

export interface ActivateResult {
	status: 'ok' | 'error';
	device_id?: string;
	reason?: string;
}
