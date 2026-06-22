# Known Onboard

The setup app for Known, the on-device network privacy monitor by Northsline.

This is a small, hosted PWA that runs once, in your browser, to provision a new
Known device:

1. Connect the device over USB.
2. Verify the device identity — a cryptographic challenge-response proves
   the device is genuine, using a key burned into the chip at manufacturing.
   No server, no account, no network call.
3. Write your Wi-Fi credentials to the device over the serial port.
4. Configure your router to point DNS to the device (instructions shown in-app).

After that, you unplug the device, plug it into a wall adapter, and use the
[Known Dashboard](https://github.com/northsline/known-dashboard) to monitor
your network locally. This app has no further role.

It was split out of `known-dashboard` so the two concerns can ship and update
independently: onboarding is a hosted, single-purpose page; the dashboard is a
richer local app.

## How it talks to the device

Provisioning uses [WebSerial](https://wicg.github.io/serial/) over a USB
CDC/ACM port at 115200 baud, speaking a line-delimited JSON protocol
(`identify` / `challenge` / `provision`). The Raspberry Pi Pico 2 W shows up
under the Raspberry Pi USB vendor ID (`0x2e8a`).

**WebSerial is Chromium-only.** Use Chrome or Edge over a secure origin
(`https://` or `localhost`). The app detects unsupported browsers and says so.

The app makes zero network calls. Device verification uses Web Crypto
(SubtleCrypto, ECDSA P-256) to verify a signature produced by the device's
private key against the Northsline root public key embedded in the PWA.

## Stack

- **SvelteKit** (Svelte 5 runes) + **Vite** + **TypeScript**
- Static adapter, ships as a self-contained client bundle with no server
- No runtime dependencies beyond the framework

## Develop

```bash
npm install
npm run dev
```

Type-check and build:

```bash
npm run check
npm run build
```

## Deploy

The build is fully static. It's intended for GitHub Pages. When building for a
project page, set `BASE_PATH` to the served subpath so asset URLs resolve:

```bash
BASE_PATH=/known-onboard npm run build
```

## License

See the Northsline project for licensing.