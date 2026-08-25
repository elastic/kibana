/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertSafeUrlResolved, createFetchUrl, redactUrl } from './http_client';

/** Every hostname in these tests resolves to a public address. */
const publicLookup = async () => [{ address: '93.184.216.34' }];

/**
 * `assertSafeUrl` is intentionally not exported: on its own it cannot see
 * where a DNS name points, so exposing it would invite callers to run the
 * weaker check. The literal-host rules are exercised here through the full
 * pre-flight, which short-circuits before DNS for literal IPs.
 */
const expectRejected = (url: string) => expect(assertSafeUrlResolved(url, publicLookup)).rejects;
const expectAllowed = (url: string) => assertSafeUrlResolved(url, publicLookup);

// ---------------------------------------------------------------------------
// assertSafeUrl — SSRF guard unit tests
// ---------------------------------------------------------------------------

describe('assertSafeUrl (via assertSafeUrlResolved)', () => {
  it('allows normal public https URL', async () => {
    await expectAllowed('https://example.com/feed.xml');
  });

  it('allows normal public http URL', async () => {
    await expectAllowed('http://example.com/feed.xml');
  });

  it('rejects non-http/https scheme', async () => {
    await expectRejected('ftp://example.com/file').toThrow(/scheme/i);
    await expectRejected('file:///etc/passwd').toThrow(/scheme/i);
  });

  it('rejects loopback IPv4 (127.0.0.1)', async () => {
    await expectRejected('http://127.0.0.1/secret').toThrow(/restricted/i);
  });

  it('rejects loopback IPv4 (127.x.x.x subnet)', async () => {
    await expectRejected('http://127.0.0.99/secret').toThrow(/restricted/i);
  });

  it('rejects cloud IMDS link-local (169.254.169.254)', async () => {
    await expectRejected('http://169.254.169.254/latest/meta-data/').toThrow(/restricted/i);
  });

  it('rejects RFC-1918 10.x.x.x', async () => {
    await expectRejected('http://10.0.0.1/internal').toThrow(/restricted/i);
  });

  it('rejects RFC-1918 172.16.x.x', async () => {
    await expectRejected('http://172.16.0.1/internal').toThrow(/restricted/i);
  });

  it('rejects RFC-1918 172.31.x.x (top of range)', async () => {
    await expectRejected('http://172.31.255.255/internal').toThrow(/restricted/i);
  });

  it('allows 172.32.x.x (just outside RFC-1918 range)', async () => {
    await expectAllowed('http://172.32.0.1/feed');
  });

  it('rejects RFC-1918 192.168.x.x', async () => {
    await expectRejected('http://192.168.1.1/internal').toThrow(/restricted/i);
  });

  it('rejects unspecified 0.0.0.0', async () => {
    await expectRejected('http://0.0.0.0/').toThrow(/restricted/i);
  });

  it('rejects IPv6 loopback ::1', async () => {
    await expectRejected('http://[::1]/secret').toThrow(/restricted/i);
  });

  it('rejects IPv6 link-local fe80::', async () => {
    await expectRejected('http://[fe80::1]/secret').toThrow(/restricted/i);
  });

  it('rejects IPv6 unique-local fc00::', async () => {
    await expectRejected('http://[fc00::1]/secret').toThrow(/restricted/i);
  });

  it('rejects IPv6 unique-local fd00::', async () => {
    await expectRejected('http://[fd00::1]/secret').toThrow(/restricted/i);
  });

  it('rejects an invalid URL', async () => {
    await expectRejected('not-a-url').toThrow(/Invalid URL/i);
  });

  // --- Bypass 1: obfuscated IPv4 encodings ---
  // The WHATWG URL parser normalizes all of these to canonical dotted-quad
  // before our code sees them, so they are caught by the IPv4 range check
  // (not a separate "obfuscated" branch).

  it('rejects decimal-encoded IPv4 (2130706433 → normalized to 127.0.0.1)', async () => {
    // URL parser: 2130706433 → 127.0.0.1 → caught by loopback range check
    await expectRejected('http://2130706433/').toThrow();
  });

  it('rejects hex-integer IPv4 (0x7f000001 → normalized to 127.0.0.1)', async () => {
    // URL parser: 0x7f000001 → 127.0.0.1 → caught by loopback range check
    await expectRejected('http://0x7f000001/').toThrow();
  });

  it('rejects hex-dotted IPv4 (0x7f.0.0.1 → normalized to 127.0.0.1)', async () => {
    await expectRejected('http://0x7f.0.0.1/').toThrow();
  });

  it('rejects octal-dotted IPv4 (0177.0.0.1 → normalized to 127.0.0.1)', async () => {
    // URL parser normalizes octal-looking segments to decimal before our check
    await expectRejected('http://0177.0.0.1/').toThrow();
  });

  // --- Bypass 2: IPv4-mapped IPv6 ---
  // The WHATWG URL parser canonicalizes the dotted form to hex groups, so
  // ::ffff:169.254.169.254 → ::ffff:a9fe:a9fe (and similar).

  it('rejects IPv4-mapped IPv6 ::ffff:169.254.169.254 (URL parser → ::ffff:a9fe:a9fe)', async () => {
    await expectRejected('http://[::ffff:169.254.169.254]/').toThrow(/restricted/i);
  });

  it('rejects IPv4-mapped IPv6 ::ffff:a9fe:a9fe (hex groups, IMDS)', async () => {
    await expectRejected('http://[::ffff:a9fe:a9fe]/').toThrow(/restricted/i);
  });

  it('rejects IPv4-mapped IPv6 ::ffff:127.0.0.1 (URL parser → ::ffff:7f00:1)', async () => {
    await expectRejected('http://[::ffff:127.0.0.1]/').toThrow(/restricted/i);
  });

  it('rejects IPv4-compatible ::169.254.169.254 (URL parser → ::a9fe:a9fe)', async () => {
    await expectRejected('http://[::169.254.169.254]/').toThrow(/restricted/i);
  });

  // --- Still allowed: normal public addresses ---

  it('allows a normal public hostname', async () => {
    await expectAllowed('https://feeds.example.com/rss');
  });

  it('allows a normal public IPv4 literal (93.184.216.34)', async () => {
    await expectAllowed('https://93.184.216.34/');
  });

  // --- Bypass 3: hostnames that always point somewhere local ---

  it('rejects localhost', async () => {
    await expectRejected('http://localhost:5601/api/status').toThrow(/restricted/i);
  });

  it('rejects a single-label host (a neighbouring service name)', async () => {
    await expectRejected('http://elasticsearch:9200/_cat/indices').toThrow(/restricted/i);
  });

  it('rejects metadata.google.internal (GCP metadata server)', async () => {
    await expectRejected('http://metadata.google.internal/computeMetadata/v1/').toThrow(
      /restricted/i
    );
  });

  it('rejects a .local mDNS host', async () => {
    await expectRejected('http://printer.local/').toThrow(/restricted/i);
  });

  // --- Bypass 4: IPv4 ranges beyond RFC1918 ---

  it('rejects 0.0.0.0/8 beyond the exact unspecified address', async () => {
    await expectRejected('http://0.0.0.1/').toThrow(/restricted/i);
  });

  it('rejects carrier-grade NAT 100.64.0.0/10', async () => {
    await expectRejected('http://100.64.0.1/').toThrow(/restricted/i);
  });

  it('rejects benchmarking range 198.18.0.0/15', async () => {
    await expectRejected('http://198.19.0.1/').toThrow(/restricted/i);
  });

  it('rejects multicast 224.0.0.0/4', async () => {
    await expectRejected('http://239.255.255.250/').toThrow(/restricted/i);
  });

  it('allows 100.63.x.x just below the CGNAT block', async () => {
    await expectAllowed('http://100.63.0.1/');
  });
});

// ---------------------------------------------------------------------------
// assertSafeUrlResolved — DNS-based checks
// ---------------------------------------------------------------------------

describe('assertSafeUrlResolved', () => {
  it('rejects a public hostname whose A record points at loopback', async () => {
    await expect(
      assertSafeUrlResolved('https://rebind.example.com/feed', async () => [
        { address: '127.0.0.1' },
      ])
    ).rejects.toThrow(/resolves to "127\.0\.0\.1"/i);
  });

  it('rejects a public hostname that points at the cloud metadata address', async () => {
    await expect(
      assertSafeUrlResolved('https://feed.example.com/rss', async () => [
        { address: '169.254.169.254' },
      ])
    ).rejects.toThrow(/restricted/i);
  });

  it('rejects when any one of several answers is private', async () => {
    await expect(
      assertSafeUrlResolved('https://feed.example.com/rss', async () => [
        { address: '93.184.216.34' },
        { address: '10.1.2.3' },
      ])
    ).rejects.toThrow(/restricted/i);
  });

  it('returns the validated address so the caller can pin the connection', async () => {
    await expect(
      assertSafeUrlResolved('https://feed.example.com/rss', async () => [
        { address: '93.184.216.34' },
      ])
    ).resolves.toEqual({ address: '93.184.216.34', family: 4 });
  });

  it('returns undefined for a literal IP, which needs no pin', async () => {
    await expect(assertSafeUrlResolved('https://93.184.216.34/')).resolves.toBeUndefined();
  });

  it('rejects a hostname that resolves to nothing', async () => {
    await expect(
      assertSafeUrlResolved('https://feed.example.com/rss', async () => [])
    ).rejects.toThrow(/did not resolve/i);
  });

  it('does not look up literal IPs', async () => {
    const lookupFn = jest.fn();
    await assertSafeUrlResolved('https://93.184.216.34/', lookupFn);
    expect(lookupFn).not.toHaveBeenCalled();
  });
});

describe('redactUrl', () => {
  it('strips userinfo so feed credentials stay out of errors and logs', () => {
    expect(redactUrl('https://svc:s3cr3t@feeds.example.com/rss')).toBe(
      'https://feeds.example.com/rss'
    );
  });

  it('leaves a credential-free URL untouched', () => {
    expect(redactUrl('https://feeds.example.com/rss')).toBe('https://feeds.example.com/rss');
  });

  it('redacts userinfo even when the URL does not parse', () => {
    expect(redactUrl('ht!tp://svc:s3cr3t@host/x')).toBe('ht!tp://host/x');
  });

  it('keeps credentials out of the invalid-URL error', async () => {
    await expectRejected('ht!tp://svc:s3cr3t@host/x').toThrow(/Invalid URL: ht!tp:\/\/host\/x/);
  });
});

// ---------------------------------------------------------------------------
// fetchUrl — redirect re-validation
// ---------------------------------------------------------------------------

const makeResponse = (
  status: number,
  headers: Record<string, string> = {},
  body = ''
): Response => {
  const headerMap = new Headers(headers);
  return {
    status,
    statusText: String(status),
    headers: headerMap,
    body: null,
    ok: status >= 200 && status < 300,
    url: '',
    text: async () => body,
  } as unknown as Response;
};

/** Streaming body so the metered read path in `readBodyWithCap` is exercised. */
const makeStreamingResponse = (status: number, chunks: string[]): Response => {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    status,
    statusText: String(status),
    headers: new Headers(),
    ok: status >= 200 && status < 300,
    url: '',
    body: {
      getReader: () => ({
        read: async () =>
          index < chunks.length
            ? { done: false, value: encoder.encode(chunks[index++]) }
            : { done: true, value: undefined },
        cancel: async () => undefined,
      }),
    },
    text: async () => chunks.join(''),
  } as unknown as Response;
};

describe('fetchUrl redirect handling', () => {
  it('rejects a redirect to a private host', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const fetchFn = jest.fn(async (url: string) => {
      callCount += 1;
      if (callCount === 1) {
        return makeResponse(301, { location: 'http://169.254.169.254/latest/meta-data/' });
      }
      return makeResponse(200, {}, 'body');
    });

    await expect(
      createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        lookupFn: publicLookup,
      })('https://example.com/feed', { abortSignal: controller.signal })
    ).rejects.toThrow(/restricted/i);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('follows a redirect to a safe host and returns the body', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const fetchFn = jest.fn(async (url: string) => {
      callCount += 1;
      if (callCount === 1) {
        return makeResponse(301, { location: 'https://cdn.example.com/feed.xml' });
      }
      return makeResponse(200, {}, '<feed/>');
    });

    const result = await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      timeoutMs: 1000,
      lookupFn: publicLookup,
    })('https://example.com/feed', { abortSignal: controller.signal });

    expect(result.body).toBe('<feed/>');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects a redirect to a hostname that resolves to a private address', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () =>
      makeResponse(302, { location: 'https://internal.example.com/' })
    );

    await expect(
      createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        lookupFn: async (hostname: string) =>
          hostname === 'internal.example.com'
            ? [{ address: '10.0.0.5' }]
            : [{ address: '93.184.216.34' }],
      })('https://example.com/feed', { abortSignal: controller.signal })
    ).rejects.toThrow(/restricted/i);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

// Credential stripping is security-critical, and a refactor that renamed
// SENSITIVE_HEADERS or broke isSameOrigin would otherwise pass CI unnoticed.
describe('fetchUrl redirect credential handling', () => {
  const SENSITIVE = {
    Authorization: 'Bearer s3cr3t',
    'x-api-key': 'key-123',
    Cookie: 'session=abc',
  };

  /** Redirects once to `location`, then returns 200. Records sent headers. */
  const redirectOnceTo = (location: string) => {
    const sent: Array<Record<string, string>> = [];
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
      sent.push({ ...((init?.headers ?? {}) as Record<string, string>) });
      return sent.length === 1 ? makeResponse(301, { location }) : makeResponse(200, {}, 'ok');
    });
    return { fetchFn, sent };
  };

  const run = (fetchFn: jest.Mock) =>
    createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      timeoutMs: 1000,
      lookupFn: publicLookup,
    })('https://example.com/feed', {
      abortSignal: new AbortController().signal,
      headers: { ...SENSITIVE, Accept: 'application/xml' },
    });

  it('strips Authorization, x-api-key and Cookie on a cross-origin hop', async () => {
    const { fetchFn, sent } = redirectOnceTo('https://evil.example.net/feed');

    await run(fetchFn);

    const afterRedirect = sent[1];
    expect(afterRedirect.Authorization).toBeUndefined();
    expect(afterRedirect['x-api-key']).toBeUndefined();
    expect(afterRedirect.Cookie).toBeUndefined();
    // Non-sensitive headers survive the hop.
    expect(afterRedirect.Accept).toBe('application/xml');
  });

  it('preserves those headers on a same-origin hop', async () => {
    const { fetchFn, sent } = redirectOnceTo('https://example.com/feed/v2');

    await run(fetchFn);

    const afterRedirect = sent[1];
    expect(afterRedirect.Authorization).toBe('Bearer s3cr3t');
    expect(afterRedirect['x-api-key']).toBe('key-123');
    expect(afterRedirect.Cookie).toBe('session=abc');
  });

  it('sends the credentials on the first request', async () => {
    const { fetchFn, sent } = redirectOnceTo('https://evil.example.net/feed');

    await run(fetchFn);

    expect(sent[0].Authorization).toBe('Bearer s3cr3t');
  });
});

describe('fetchUrl redirect hop limit', () => {
  it('stops after MAX_REDIRECT_HOPS rather than following forever', async () => {
    let hop = 0;
    const fetchFn = jest.fn(async () => {
      hop += 1;
      return makeResponse(302, { location: `https://example.com/hop-${hop}` });
    });

    await expect(
      createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        lookupFn: publicLookup,
      })('https://example.com/feed', { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/Exceeded maximum redirect hops \(5\)/);

    // Initial request plus the five permitted hops.
    expect(fetchFn).toHaveBeenCalledTimes(6);
  });
});

describe('fetchUrl DNS pinning', () => {
  /** Captures the RequestInit so the dispatcher can be inspected. */
  const capturingFetch = () => {
    let init: (RequestInit & { dispatcher?: unknown }) | undefined;
    const fetchFn = jest.fn(async (_url: string, requestInit?: RequestInit) => {
      init = requestInit as RequestInit & { dispatcher?: unknown };
      return makeResponse(200, {}, 'ok');
    });
    return { fetchFn, getInit: () => init };
  };

  const fetchThrough = (url: string, fetchFn: jest.Mock) =>
    createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      timeoutMs: 1000,
      lookupFn: publicLookup,
    })(url, { abortSignal: new AbortController().signal });

  it('pins the connection to the address the pre-flight validated', async () => {
    const { fetchFn, getInit } = capturingFetch();

    await fetchThrough('https://feed.example.com/rss', fetchFn);

    // A dispatcher pinned to the validated address closes the rebinding window
    // between the pre-flight lookup and the connect.
    expect(getInit()?.dispatcher).toBeDefined();
  });

  it('does not pin when the host is already a literal IP', async () => {
    const { fetchFn, getInit } = capturingFetch();

    await fetchThrough('https://93.184.216.34/rss', fetchFn);

    expect(getInit()?.dispatcher).toBeUndefined();
  });
});

describe('fetchUrl body cap', () => {
  it('enforces the cap on a streaming body', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () =>
      makeStreamingResponse(200, ['a'.repeat(64), 'b'.repeat(64)])
    );

    await expect(
      createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        maxBytes: 100,
        lookupFn: publicLookup,
      })('https://example.com/feed', { abortSignal: controller.signal })
    ).rejects.toThrow(/exceeded the 100-byte cap/i);
  });

  it('enforces the cap when the response exposes no stream', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () => makeResponse(200, {}, 'x'.repeat(200)));

    await expect(
      createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        maxBytes: 100,
        lookupFn: publicLookup,
      })('https://example.com/feed', { abortSignal: controller.signal })
    ).rejects.toThrow(/exceeded the 100-byte cap/i);
  });

  it('returns a streamed body that fits under the cap', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () => makeStreamingResponse(200, ['<feed', '/>']));

    const result = await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      timeoutMs: 1000,
      maxBytes: 100,
      lookupFn: publicLookup,
    })('https://example.com/feed', { abortSignal: controller.signal });

    expect(result.body).toBe('<feed/>');
  });
});
