/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import net from 'node:net';
import dns from 'node:dns/promises';
import { Agent } from 'undici';
import { isNonRoutableIPv4, isNonRoutableIPv6 } from '../lib/ip_ranges';

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
 * A trailing dot makes a hostname a fully-qualified absolute name, and DNS
 * resolves `metadata.google.internal.` exactly like the dotless form. It also
 * defeats a naive `endsWith('.internal')`, so strip it before matching the
 * suffix list. The WHATWG parser already removes it from IPv4 literals, so this
 * only ever sees DNS names.
 */
const stripTrailingDot = (host: string): string => host.replace(/\.$/, '');

/**
 * Feed URLs always carry a registrable domain, so a single-label host
 * (`localhost`, `metadata`, a Kubernetes service name) is never a real source
 * and is the cheapest way to reach a neighbouring service.
 */
const isRestrictedHostname = (rawHost: string): boolean => {
  const host = stripTrailingDot(rawHost);
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
    // Unparseable input can still contain `scheme://user:pass@host`, and this branch
    // exists *because* the input is malformed, so it must not assume valid userinfo
    // syntax. The old `[^/@\s]*@` stopped at the first `/` and the first `@`, which
    // left credentials in place for `//user:sec/ret@host` and `//us@er:s3cr3t@host`.
    // Over-redact through the last `@` instead: losing part of a malformed URL in an
    // error message is strictly better than logging a password.
    return rawUrl.replace(/\/\/\S*@/, '//');
  }
};

/**
 * Moves `user:password@host` off the URL and into a Basic credential.
 *
 * Node's fetch rejects a URL containing credentials outright (`TypeError:
 * Request cannot be constructed from a URL that includes credentials`) before it
 * issues anything, so an authenticated feed could be saved, validated, and
 * scheduled, and then fail on every run. The credential becomes an
 * `Authorization` header and the request goes to the credential-free URL.
 *
 * The header is merged into the per-hop header set, so the cross-origin
 * stripping in `fetchUrlImpl` covers it exactly as it covers a caller-supplied
 * `Authorization`. Userinfo is percent-encoded in a URL and Basic auth wants the
 * decoded bytes, hence the `decodeURIComponent`.
 */
const splitUrlCredentials = (rawUrl: string): { url: string; authorization?: string } => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // Left for `assertSafeUrl` to reject with a redacted message.
    return { url: rawUrl };
  }
  if (!parsed.username && !parsed.password) return { url: rawUrl };

  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  parsed.username = '';
  parsed.password = '';
  return {
    url: parsed.toString(),
    authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
  };
};

/**
 * Blocks SSRF: http/https only, no private/link-local/reserved IPs (literal
 * host only).
 *
 * Deliberately not exported. It cannot see where a DNS name points, so a
 * caller who used it directly before making a request would miss the
 * "public name, private A record" vector. `assertSafeUrlResolved` is the
 * complete check and the only one callers should reach for.
 */
const assertSafeUrl = (rawUrl: string): void => {
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
    if (isNonRoutableIPv4(ip)) {
      throw new Error(`URL host "${host}" is in a restricted IPv4 address range`);
    }
    return;
  }

  if (ipFamily === 6) {
    if (isNonRoutableIPv6(ip)) {
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
 * The address the pre-flight validated, so the connection can be pinned to it.
 * `undefined` when the URL host was already a literal IP and there is nothing
 * to pin.
 */
interface ValidatedAddress {
  address: string;
  family: 4 | 6;
}

/**
 * Full pre-flight check: the literal checks in `assertSafeUrl`, then DNS
 * resolution so a public hostname that points at a private address is rejected
 * before any connection is made.
 *
 * Returns the validated address so the caller can pin the connection to it.
 * Validating and then letting Node resolve the name again at connect time
 * leaves a DNS-rebinding window in which the second answer differs from the
 * one that was checked; `fetchUrl` closes that by pinning.
 */
export const assertSafeUrlResolved = async (
  rawUrl: string,
  lookupFn: DnsLookupFn = defaultLookup
): Promise<ValidatedAddress | undefined> => {
  assertSafeUrl(rawUrl);

  const host = new URL(rawUrl).hostname.toLowerCase();
  // Literal IPs were already classified; skip the pointless lookup.
  if (net.isIP(host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host) !== 0) {
    return undefined;
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
      (family === 4 && isNonRoutableIPv4(address)) ||
      (family === 6 && isNonRoutableIPv6(address))
    ) {
      throw new Error(
        `URL host "${host}" resolves to "${address}", which is in a restricted address range`
      );
    }
  }

  // Every answer passed, so pinning to the first is safe and keeps the
  // connection on an address this function actually checked.
  const [{ address }] = addresses;
  const family = net.isIP(address);
  return family === 4 || family === 6 ? { address, family } : undefined;
};

/**
 * Dispatcher that forces the connection onto the pre-validated address instead
 * of re-resolving the hostname, closing the DNS-rebinding window between the
 * pre-flight check and the connect. `servername` is left alone so TLS SNI and
 * the Host header still carry the original hostname and certificate
 * verification is unaffected.
 */
type ConnectLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (
    err: NodeJS.ErrnoException | null,
    addressOrList: string | Array<{ address: string; family: number }>,
    family?: number
  ) => void
) => void;

/**
 * The connect-time lookup a pinned dispatcher installs. Always answers with the
 * pre-validated address, whatever the hostname, which is what closes the rebinding
 * window: the socket cannot be handed an address the guard never checked.
 *
 * Named and exported (as `pinnedLookupForTest`) so the pin can be asserted directly
 * rather than by reflecting into undici's private option storage.
 */
const pinnedLookup =
  ({ address, family }: ValidatedAddress): ConnectLookup =>
  (_hostname, options, callback) => {
    // Node's net layer calls this either in `all` mode or single-answer mode
    // depending on the connect path, so satisfy both shapes.
    if (options?.all) {
      callback(null, [{ address, family }]);
    } else {
      callback(null, address, family);
    }
  };

/** Exported for tests only: the lookup installed by `createPinnedDispatcher`. */
export const pinnedLookupForTest = pinnedLookup;

const createPinnedDispatcher = (pinned: ValidatedAddress): Agent =>
  new Agent({ connect: { lookup: pinnedLookup(pinned) } });

/**
 * The public contract. Deliberately does not expose the test seams below: they
 * would show up in every caller's autocomplete and could not be removed later
 * without a breaking change, and `fetchFn` / `lookupFn` in particular are ways
 * to bypass the SSRF guard.
 */
export interface FetchUrlOptions {
  /** Step-level cancellation. Combined with the per-request timeout. */
  abortSignal: AbortSignal;
  /** Optional request headers, including adapter-specific `Accept` values. */
  headers?: Record<string, string>;
}

/** Internal seams, settable only through `createFetchUrl`. */
interface FetchUrlDeps {
  timeoutMs: number;
  maxBytes: number;
  fetchFn: typeof fetch;
  lookupFn: DnsLookupFn;
}

const DEFAULT_DEPS: FetchUrlDeps = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  maxBytes: DEFAULT_MAX_BYTES,
  fetchFn: (...args) => globalThis.fetch(...args),
  lookupFn: defaultLookup,
};

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
const SENSITIVE_HEADERS = new Set([
  'authorization',
  // Standard credential header, and the public `headers` option can carry it, so a
  // feed host that redirects cross-origin would otherwise receive proxy credentials.
  'proxy-authorization',
  'x-api-key',
  'cookie',
]);

const isSameOrigin = (a: string, b: string): boolean => {
  try {
    const pa = new URL(a);
    const pb = new URL(b);
    return pa.origin === pb.origin;
  } catch {
    return false;
  }
};

/**
 * Statuses that carry a `Location` and are actually followed. Treating every 3xx
 * as a redirect made a legitimate 304 (which a caller can provoke with
 * conditional headers) throw "missing Location" instead of being returned.
 */
const FOLLOWED_REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

/**
 * Races a DNS pre-flight against the run's combined timeout/cancellation signal.
 *
 * `dns.lookup` does not take an AbortSignal, so on its own a stalled resolver
 * outlives both the per-request timeout and a step abort: the feed run stays
 * pending indefinitely. Since the hostname comes from an untrusted source
 * document, that is a task-worker resource-exhaustion vector. The guard cannot
 * be the only thing bounding it. The lookup itself keeps running in the background, but this
 * function stops waiting on it.
 */
const assertSafeUrlResolvedWithin = async (
  rawUrl: string,
  lookupFn: DnsLookupFn,
  signal: AbortSignal
): Promise<ValidatedAddress | undefined> => {
  if (signal.aborted) {
    throw new Error(`Aborted before resolving "${redactUrl(rawUrl)}"`);
  }
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      assertSafeUrlResolved(rawUrl, lookupFn),
      new Promise<never>((_, reject) => {
        onAbort = () =>
          reject(
            new Error(
              `Timed out or aborted resolving "${redactUrl(rawUrl)}" before any connection was made`
            )
          );
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
};

const fetchUrlImpl = async (
  url: string,
  options: FetchUrlOptions,
  deps: FetchUrlDeps
): Promise<FetchUrlResult> => {
  const { abortSignal, headers } = options;
  const { timeoutMs, maxBytes, fetchFn, lookupFn } = deps;

  // Credentials cannot ride on the URL (Node's fetch rejects it), so they move
  // to a header and everything downstream sees the credential-free form. That
  // also keeps them out of `finalUrl`.
  const { url: initialUrl, authorization } = splitUrlCredentials(url);

  // The signal is established before validation, not after, so the DNS pre-flight
  // is inside the timeout too. Resolution happens before any connection, so a
  // resolver that never answers used to sit outside every bound this function has.
  const { signal, cancel } = linkSignals(abortSignal, timeoutMs);
  let pinned: ValidatedAddress | undefined;
  let dispatcher: Agent | undefined;

  try {
    pinned = await assertSafeUrlResolvedWithin(initialUrl, lookupFn, signal);
    dispatcher = pinned ? createPinnedDispatcher(pinned) : undefined;
    let currentUrl = initialUrl;
    let hopsRemaining = MAX_REDIRECT_HOPS;
    // A caller-supplied Authorization wins over one derived from userinfo: it is
    // the more specific instruction, and the source config may carry stale
    // credentials the adapter is deliberately overriding.
    // Header names are case-insensitive, so a caller passing `authorization` in any
    // casing must fully replace the URL-derived credential. Spreading both left two
    // distinct keys in the object, and fetch normalizes the names, so the stale URL
    // credential could be sent alongside the intended one and fail authentication.
    const callerHeaders = headers ?? {};
    const callerHasAuthorization = Object.keys(callerHeaders).some(
      (key) => key.toLowerCase() === 'authorization'
    );
    let currentHeaders: Record<string, string> = {
      ...(authorization && !callerHasAuthorization ? { Authorization: authorization } : {}),
      ...callerHeaders,
    };

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
        // Pins the socket to the address the pre-flight validated. Not part of
        // the standard RequestInit type, but Node's fetch (undici) reads it.
        ...(dispatcher ? { dispatcher } : {}),
      } as RequestInit);

      // Not a followed redirect — consume and return the response body. This
      // includes 3xx statuses that carry no Location, such as a 304 answering a
      // caller's conditional headers.
      if (!FOLLOWED_REDIRECT_STATUSES.has(response.status)) {
        const body = await readBodyWithCap(response, maxBytes);
        return {
          status: response.status,
          statusText: response.statusText,
          body,
          headers: headersToRecord(response.headers),
          finalUrl: currentUrl,
        };
      }

      // Read what we need off the redirect, then release the stream immediately,
      // before anything that can throw. Everything below (URL parsing, the hop
      // limit, the destination SSRF check) can reject, and `finally` then calls
      // `Agent.close()`, which waits on in-flight requests. An unread body keeps
      // this request in flight, so a server streaming an endless redirect body
      // could hang the whole feed run.
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => {});

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
      // legitimate feed host is the usual way into the internal network. The
      // hop gets its own pin, so each connection goes to an address that was
      // checked for that specific host.
      // Each hop gets its own pin, so every connection goes to an address that
      // was checked for that specific host. Inside the signal, as above.
      pinned = await assertSafeUrlResolvedWithin(nextUrl, lookupFn, signal);
      await dispatcher?.close().catch(() => {});
      dispatcher = pinned ? createPinnedDispatcher(pinned) : undefined;

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
    await dispatcher?.close().catch(() => {});
  }
};

/**
 * Builds a `fetchUrl` with the internal seams overridden. Tests use this; the
 * production entry point below is the same function with defaults, so callers
 * never see the seams.
 */
export const createFetchUrl =
  (overrides: Partial<FetchUrlDeps> = {}) =>
  (url: string, options: FetchUrlOptions): Promise<FetchUrlResult> =>
    fetchUrlImpl(url, options, { ...DEFAULT_DEPS, ...overrides });

export const fetchUrl = createFetchUrl();

/**
 * Resolves the fetcher for an adapter run. Production runs carry no transport
 * overrides and get the default; adapter tests inject them through the run
 * context. Keeping the seam on the run context rather than on every
 * `fetchUrl` call means production callers cannot reach it by accident.
 */
export const fetchUrlForContext = (context: {
  fetchFn?: typeof fetch;
  lookupFn?: DnsLookupFn;
}): typeof fetchUrl =>
  context.fetchFn || context.lookupFn
    ? createFetchUrl({
        ...(context.fetchFn ? { fetchFn: context.fetchFn } : {}),
        ...(context.lookupFn ? { lookupFn: context.lookupFn } : {}),
      })
    : fetchUrl;
