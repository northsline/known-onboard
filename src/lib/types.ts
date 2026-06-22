// Onboarding domain types.
//
// The provisioning flow is: connect over USB, verify the device via
// cryptographic challenge-response, then write Wi-Fi credentials over
// serial. The serial protocol shapes live in serial.ts; the crypto
// verification shapes live in crypto.ts.
