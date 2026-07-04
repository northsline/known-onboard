// Pure client app, no SSR. Onboarding runs in the browser and talks to the
// device over USB (WebSerial). No network calls. Device verification is
// fully offline via cryptographic challenge-response.
export const ssr = false;
export const prerender = false;
