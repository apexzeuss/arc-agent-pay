// Circle's Modular Wallets SDK is a browser-only library that touches `window`
// internally (its bundler transport calls `window.fetch`). Node 24 has global
// fetch but not a `window` global. Aliasing window → globalThis is sufficient
// to let the SDK run server-side. Imported first by any Node-side script that
// uses @circle-fin/modular-wallets-core.
(globalThis as { window?: typeof globalThis }).window ??= globalThis;

// The SDK reads `window.location.hostname` to build its X-AppInfo header,
// which Circle's backend validates against the client key's Allowed Domain.
// Default to localhost; override with CIRCLE_CLIENT_HOSTNAME if needed.
const HOSTNAME = process.env.CIRCLE_CLIENT_HOSTNAME ?? "localhost";
(globalThis as { location?: { hostname: string; protocol: string } }).location ??= {
  hostname: HOSTNAME,
  protocol: "http:",
};
