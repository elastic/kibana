/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import net from 'node:net';
import dns from 'node:dns/promises';

const DEFAULT_USER_AGENT = 'Kibana-ThreatIntel/1.0 (+https://www.elastic.co/security)';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECT_HOPS = 5;

// ---------------------------------------------------------------------------
// SSRF guard
// ---------------------------------------------------------------------------

/**
 * Hostname suffixes that resolve to loopback or to an internal resolver in
 * common deployments. `.internal` also covers `metadata.google.internal`.
 */
const RESTRICTED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain'];

/**
 * Feed URLs always carry a registrable domain, so a single-label host
 * (`localhost`, `metadata`, a Kubernetes service name) is never a real source
 * and is the cheapest way to reach a neighbouring service.
 */
const isRestrictedHostname = (host: string): boolean => {
  if (!host.includes('.')) return true;
  return RESTRICTED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
};

/**
 * Drops `user:password@` before a URL reaches an error message or a log line.
 * Adapter errors carry the failing URL, and source configs can embed feed
 * credentials in userinfo.
 */
export const redactUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.username && !parsed.password) return rawUrl;
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    // Unparseable input can still contain `scheme://user:pass@host`.
    return rawUrl.replace(/\/\/[^/@\s]*@/, '//');
  }
};

/** Blocks SSRF: http/https only, no private/link-local/reserved IPs (literal host only). */
export const assertSafeUrl = (rawUrl: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${redactUrl(rawUrl)}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsafe URL scheme "${parsed.protocol}" — only http/https is allowed`);
  }

  // URL.hostname strips the brackets from IPv6 literals ([::1] → ::1).
  const host = parsed.hostname.toLowerCase();

  // The WHATWG URL parser normalizes the host before we see it:
  //   - Integer/hex/octal IPv4 forms (2130706433, 0x7f000001, 0177.0.0.1) → canonical dotted-quad
  //   - IPv4-mapped IPv6 with dotted suffix (::ffff:169.254.169.254) → hex-group form (::ffff:a9fe:a9fe)
  //   - IPv6 literals are returned with surrounding brackets ([::1])
  // We strip the brackets, then use net.isIP to classify:
  //   4 → canonical dotted-quad IPv4
  //   6 → IPv6 literal
  //   0 → DNS hostname (obfuscated forms never reach here — URL parser normalised them)

  // Strip brackets that URL.hostname includes for IPv6 literals.
  const ip = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  const ipFamily = net.isIP(ip);

  if (ipFamily === 4) {
    if (isRestrictedIPv4(ip)) {
      throw new Error(`URL host "${host}" is in a restricted IPv4 address range`);
    }
    return;
  }

  if (ipFamily === 6) {
    if (isRestrictedIPv6(ip)) {
      throw new Error(`URL host "${host}" is in a restricted IPv6 address range`);
    }
    return;
  }

  // ipFamily === 0: DNS hostname. The literal checks above cannot see where it
  // points, so reject the names that always resolve somewhere local and leave
  // the resolved-address check to `assertSafeUrlResolved`.
  if (isRestrictedHostname(host)) {
    throw new Error(`URL host "${host}" is a restricted local hostname`);
  }
};

/** Injectable for tests; matches the shape of `dns.lookup(host, { all: true })`. */
export type DnsLookupFn = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultLookup: DnsLookupFn = (hostname) => dns.lookup(hostname, { all: true });

/**
 * Full pre-flight check: the literal checks in `assertSafeUrl`, then DNS
 * resolution so a public hostname that points at a private address is rejected
 * before any connection is made.
 *
 * This closes the "public name, private A record" case. It does not close DNS
 * rebinding, because Node resolves the name again when it connects and the
 * second answer can differ. Pinning the validated address requires a custom
 * dispatcher that `fetch` does not expose, so treat this as one layer and keep
 * feed URLs operator-managed.
 */
export const assertSafeUrlResolved = async (
  rawUrl: string,
  lookupFn: DnsLookupFn = defaultLookup
): Promise<void> => {
  assertSafeUrl(rawUrl);

  const host = new URL(rawUrl).hostname.toLowerCase();
  // Literal IPs were already classified; skip the pointless lookup.
  if (net.isIP(host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host) !== 0) {
    return;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookupFn(host);
  } catch (err) {
    throw new Error(`Could not resolve URL host "${host}": ${(err as Error).message}`);
  }

  if (addresses.length === 0) {
    throw new Error(`URL host "${host}" did not resolve to any address`);
  }

  for (const { address } of addresses) {
    const family = net.isIP(address);
    if (
      (family === 4 && isRestrictedIPv4(address)) ||
      (family === 6 && isRestrictedIPv6(address))
    ) {
      throw new Error(
        `URL host "${host}" resolves to "${address}", which is in a restricted address range`
      );
    }
  }
};

/** Convert two 16-bit hex groups (as strings) to dotted-quad IPv4 notation. */
const hexGroupsToDotted = (hiHex: string, loHex: string): string => {
  const hi = parseInt(hiHex, 16);
  const lo = parseInt(loHex, 16);
  return [Math.floor(hi / 256), hi % 256, Math.floor(lo / 256), lo % 256].join('.');
};

const isRestrictedIPv4 = (ip: string): boolean => {
  const [a, b, c] = ip.split('.').map(Number);
  // loopback 127.0.0.0/8
  if (a === 127) return true;
  // link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // private 10.0.0.0/8
  if (a === 10) return true;
  // private 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // private 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // "this network" 0.0.0.0/8 — 0.0.0.1 and friends also route to local on some stacks
  if (a === 0) return true;
  // carrier-grade NAT 100.64.0.0/10 — internal in most cloud networks
  if (a === 100 && b >= 64 && b <= 127) return true;
  // IETF protocol assignments 192.0.0.0/24
  if (a === 192 && b === 0 && c === 0) return true;
  // benchmarking 198.18.0.0/15
  if (a === 198 && (b === 18 || b === 19)) return true;
  // multicast 224.0.0.0/4 and reserved/broadcast 240.0.0.0/4
  if (a >= 224) return true;
  return false;
};

const isRestrictedIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();

  // loopback ::1 / unspecified ::
  if (lower === '::1' || lower === '::') return true;

  // link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;

  // unique-local fc00::/7 (fc and fd prefixes)
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;

  // IPv4-mapped  ::ffff:<ipv4>  and IPv4-compatible  ::<ipv4>
  // Forms seen in the wild:
  //   ::ffff:169.254.169.254   (dotted)
  //   ::ffff:a9fe:a9fe         (two hex groups)
  //   ::ffff:0:169.254.169.254 (alternative mapped prefix)
  //   ::169.254.169.254        (IPv4-compatible, deprecated but still parsed)
  const mappedDotted = lower.match(/^::(?:ffff:(?:0:)?)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) {
    return isRestrictedIPv4(mappedDotted[1]);
  }
  // ::ffff:<hi>:<lo> — IPv4-mapped (canonical form from URL parser for e.g. ::ffff:169.254.169.254)
  const mappedFfff = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedFfff) {
    return isRestrictedIPv4(hexGroupsToDotted(mappedFfff[1], mappedFfff[2]));
  }

  // ::<hi>:<lo> — IPv4-compatible (deprecated; URL parser converts ::169.254.169.254 → ::a9fe:a9fe).
  // Only match the exact two-group-after-:: form to avoid false-positives on normal short IPv6.
  const compatHex = lower.match(/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (compatHex) {
    return isRestrictedIPv4(hexGroupsToDotted(compatHex[1], compatHex[2]));
  }

  return false;
};

export interface FetchUrlOptions {
  /** Step-level cancellation. Combined with the per-request timeout. */
  abortSignal: AbortSignal;
  /** Optional headers. Adapter sets `Accept` for STIX/TAXII negotiation. */
  headers?: Record<string, string>;
  /** Override default 30s. Used only by tests today. */
  timeoutMs?: number;
  /** Override default 10MiB cap. Used only by tests today. */
  maxBytes?: number;
  /** Override `globalThis.fetch`. Used only by tests today. */
  fetchFn?: typeof fetch;
  /** Override DNS resolution for the SSRF pre-flight. Used only by tests today. */
  lookupFn?: DnsLookupFn;
}

export interface FetchUrlResult {
  status: number;
  statusText: string;
  body: string;
  /** Lower-cased response header names to single string values. */
  headers: Record<string, string>;
  /** Final URL after redirects, useful for adapters that want to reflect it on `source.url`. */
  finalUrl: string;
}

/**
 * Combined-signal helper. We can't pass both `abortSignal` and the
 * timeout abort to fetch (only one signal field), so we forward the
 * caller's signal to a fresh `AbortController` and add the timeout to
 * the same controller.
 */
const linkSignals = (
  outer: AbortSignal,
  timeoutMs: number
): { signal: AbortSignal; cancel: () => void } => {
  const controller = new AbortController();
  const onAbort = () => controller.abort(outer.reason);
  if (outer.aborted) {
    controller.abort(outer.reason);
  } else {
    outer.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(new Error(`Timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      outer.removeEventListener('abort', onAbort);
    },
  };
};

/**
 * Read a Web ReadableStream into a single string with an enforced byte
 * cap. We can't trust `Content-Length` (chunked + gzip responses often
 * omit it) so the cap is enforced incrementally on the decoded chunks.
 */
const readBodyWithCap = async (response: Response, maxBytes: number): Promise<string> => {
  if (!response.body) {
    // No stream to meter, so the cap has to be applied after the fact. Still
    // enforce it rather than returning an unbounded string.
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new Error(`Response body exceeded the ${maxBytes}-byte cap`);
    }
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let received = 0;
  let result = '';
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) {
      received += chunk.value.byteLength;
      if (received > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // best-effort cancel; nothing actionable on close error
        }
        throw new Error(
          `Response body exceeded the ${maxBytes}-byte cap (saw at least ${received} bytes)`
        );
      }
      result += decoder.decode(chunk.value, { stream: true });
    }
  }
  result += decoder.decode();
  return result;
};

const headersToRecord = (headers: Headers): Record<string, string> => {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
};

// Sensitive headers that must be stripped when following a cross-origin redirect.
const SENSITIVE_HEADERS = new Set(['authorization', 'x-api-key', 'cookie']);

const isSameOrigin = (a: string, b: string): boolean => {
  try {
    const pa = new URL(a);
    const pb = new URL(b);
    return pa.origin === pb.origin;
  } catch {
    return false;
  }
};

export const fetchUrl = async (url: string, options: FetchUrlOptions): Promise<FetchUrlResult> => {
  const {
    abortSignal,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    fetchFn = globalThis.fetch,
    lookupFn,
  } = options;

  // Validate the initial URL before any network activity.
  await assertSafeUrlResolved(url, lookupFn);

  const { signal, cancel } = linkSignals(abortSignal, timeoutMs);

  try {
    let currentUrl = url;
    let hopsRemaining = MAX_REDIRECT_HOPS;
    let currentHeaders = { ...(headers ?? {}) };

    while (true) {
      const response = await fetchFn(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/json, application/xml, text/xml, application/atom+xml, */*',
          'Accept-Encoding': 'gzip, deflate',
          ...currentHeaders,
        },
        signal,
      });

      // Not a redirect — consume and return the response body.
      if (response.status < 300 || response.status >= 400) {
        const body = await readBodyWithCap(response, maxBytes);
        return {
          status: response.status,
          statusText: response.statusText,
          body,
          headers: headersToRecord(response.headers),
          finalUrl: currentUrl,
        };
      }

      // Redirect: extract Location, validate, and follow.
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response (${response.status}) missing Location header`);
      }

      // Resolve relative redirects against the current URL.
      const nextUrl = new URL(location, currentUrl).toString();

      if (hopsRemaining <= 0) {
        throw new Error(`Exceeded maximum redirect hops (${MAX_REDIRECT_HOPS})`);
      }
      hopsRemaining -= 1;

      // SSRF guard on each redirect destination — an open redirect on a
      // legitimate feed host is the usual way into the internal network.
      await assertSafeUrlResolved(nextUrl, lookupFn);

      // Release the redirect body so the connection is not held open.
      await response.body?.cancel().catch(() => {});

      // Strip sensitive headers on cross-origin hops to prevent credential leakage.
      if (!isSameOrigin(currentUrl, nextUrl)) {
        const stripped: Record<string, string> = {};
        for (const [k, v] of Object.entries(currentHeaders)) {
          if (!SENSITIVE_HEADERS.has(k.toLowerCase())) {
            stripped[k] = v;
          }
        }
        currentHeaders = stripped;
      }

      currentUrl = nextUrl;
    }
  } finally {
    cancel();
  }
};
