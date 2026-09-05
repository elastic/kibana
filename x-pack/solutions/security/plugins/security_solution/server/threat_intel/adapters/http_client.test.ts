/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertSafeUrlResolved,
  createFetchUrl,
  pinnedLookupForTest,
  redactUrl,
} from './http_client';

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

  // A trailing dot is a valid absolute FQDN that DNS resolves identically, and it
  // used to slip past `endsWith('.internal')`.
  it('rejects a trailing-dot FQDN of a restricted suffix', async () => {
    await expectRejected('http://metadata.google.internal./computeMetadata/v1/').toThrow(
      /restricted local hostname/
    );
  });

  it('rejects a trailing-dot single-label host', async () => {
    await expectRejected('http://localhost./').toThrow(/restricted local hostname/);
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

  /** Calls the pinned lookup the way Node's net layer does, in both call shapes. */
  const throughPin = (pinned: { address: string; family: 4 | 6 }, all: boolean) =>
    new Promise((resolve, reject) => {
      pinnedLookupForTest(pinned)('any.host.example', { all }, (err, addr, family) =>
        err ? reject(err) : resolve(all ? addr : { address: addr, family })
      );
    });

  // The pin itself, asserted directly rather than by reflecting into undici's private
  // option storage. Checking only that a dispatcher object exists would pass even if
  // the Agent re-resolved the hostname or pinned the wrong address.
  it('hands the connect layer the validated address in `all` mode', async () => {
    await expect(throughPin({ address: '93.184.216.34', family: 4 }, true)).resolves.toEqual([
      { address: '93.184.216.34', family: 4 },
    ]);
  });

  it('hands the connect layer the validated address in single-answer mode', async () => {
    await expect(throughPin({ address: '93.184.216.34', family: 4 }, false)).resolves.toEqual({
      address: '93.184.216.34',
      family: 4,
    });
  });

  it('answers with the pinned address regardless of the hostname asked for', async () => {
    // The whole point: the resolver is never consulted again, so a second answer
    // cannot differ from the one the guard checked.
    await expect(throughPin({ address: '2606:4700::1111', family: 6 }, true)).resolves.toEqual([
      { address: '2606:4700::1111', family: 6 },
    ]);
  });

  // And the other half of the guarantee: the pre-flight returns the address that gets
  // pinned, so a rebinding second answer never reaches the socket.
  it('pins the address the pre-flight validated, not a later answer', async () => {
    let call = 0;
    const rebinding = async () => {
      call += 1;
      return call === 1 ? [{ address: '93.184.216.34' }] : [{ address: '169.254.169.254' }];
    };

    const validated = await assertSafeUrlResolved('https://feed.example.com/rss', rebinding);

    expect(validated).toEqual({ address: '93.184.216.34', family: 4 });
    await expect(throughPin(validated!, true)).resolves.toEqual([
      { address: '93.184.216.34', family: 4 },
    ]);
  });

  it('attaches a dispatcher to the request when the host is a DNS name', async () => {
    const { fetchFn, getInit } = capturingFetch();

    await fetchThrough('https://feed.example.com/rss', fetchFn);

    expect(getInit()?.dispatcher).toBeDefined();
  });

  // Each hop gets its own pin, so a redirect cannot inherit the previous host's.
  it('attaches a separate dispatcher to each redirect hop', async () => {
    const seen: unknown[] = [];
    let hop = 0;
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
      seen.push((init as RequestInit & { dispatcher?: unknown }).dispatcher);
      hop += 1;
      return hop === 1
        ? makeResponse(302, { location: 'https://second.example.com/rss' })
        : makeResponse(200, {}, 'ok');
    });

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: async (host: string) =>
        host === 'second.example.com'
          ? [{ address: '198.51.100.7' }]
          : [{ address: '93.184.216.34' }],
    })('https://first.example.com/rss', { abortSignal: new AbortController().signal });

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBeDefined();
    expect(seen[1]).toBeDefined();
    expect(seen[0]).not.toBe(seen[1]);
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

// ---------------------------------------------------------------------------
// Credentials embedded in the feed URL
// ---------------------------------------------------------------------------

describe('fetchUrl with credentials in the URL', () => {
  const capture = () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
      seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return makeResponse(200, {}, 'ok');
    });
    return { fetchFn, seen };
  };

  // Node's fetch throws on a URL containing credentials before it issues
  // anything, so an authenticated feed could be saved and scheduled and then
  // fail on every single run.
  it('requests the credential-free URL', async () => {
    const { fetchFn, seen } = capture();

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
    });

    expect(seen[0].url).toBe('https://example.com/feed.xml');
    expect(seen[0].url).not.toContain('s3cret');
  });

  it('sends the credential as Basic authorization instead', async () => {
    const { fetchFn, seen } = capture();

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
    });

    expect(seen[0].headers.Authorization).toBe(
      `Basic ${Buffer.from('feeduser:s3cret').toString('base64')}`
    );
  });

  it('decodes percent-encoded userinfo', async () => {
    const { fetchFn, seen } = capture();

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://us%40er:p%3Ass@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
    });

    expect(seen[0].headers.Authorization).toBe(
      `Basic ${Buffer.from('us@er:p:ss').toString('base64')}`
    );
  });

  it('keeps the credential out of finalUrl', async () => {
    const { fetchFn } = capture();

    const result = await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
    });

    expect(result.finalUrl).toBe('https://example.com/feed.xml');
  });

  it('lets a caller-supplied Authorization win over the URL credential', async () => {
    const { fetchFn, seen } = capture();

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
      headers: { Authorization: 'Bearer explicit' },
    });

    expect(seen[0].headers.Authorization).toBe('Bearer explicit');
  });

  // The derived header has to be subject to the same redirect stripping as a
  // caller-supplied one, or moving the credential off the URL would have traded
  // one leak for another.
  it('strips the derived credential on a cross-origin redirect', async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
      seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return seen.length === 1
        ? makeResponse(302, { location: 'https://elsewhere.test/feed.xml' })
        : makeResponse(200, {}, 'ok');
    });

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
    });

    expect(seen).toHaveLength(2);
    expect(seen[0].headers.Authorization).toBeDefined();
    expect(seen[1].headers.Authorization).toBeUndefined();
  });

  it('keeps the derived credential on a same-origin redirect', async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
      seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return seen.length === 1
        ? makeResponse(302, { location: 'https://example.com/feed-v2.xml' })
        : makeResponse(200, {}, 'ok');
    });

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
    });

    expect(seen[1].headers.Authorization).toBeDefined();
  });

  // The SSRF guard must still see the host, and the credential must not become a
  // way to reach an internal address.
  it('still applies the SSRF guard to a credentialed URL', async () => {
    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: async () => [{ address: '169.254.169.254' }],
      })('https://feeduser:s3cret@example.com/feed.xml', {
        abortSignal: new AbortController().signal,
      })
    ).rejects.toThrow(/restricted address range/);
  });
});

// ---------------------------------------------------------------------------
// Bounds and stream hygiene on the redirect path
// ---------------------------------------------------------------------------

/** Response whose body stream records whether it was released. */
const makeResponseWithBody = (status: number, headers: Record<string, string> = {}) => {
  const cancel = jest.fn().mockResolvedValue(undefined);
  const response = {
    status,
    statusText: String(status),
    headers: new Headers(headers),
    body: { cancel, getReader: () => ({ read: async () => ({ done: true }) }) },
    ok: false,
    url: '',
    text: async () => '',
  } as unknown as Response;
  return { response, cancel };
};

describe('fetchUrl DNS pre-flight bounds', () => {
  // dns.lookup takes no AbortSignal, so a stalled resolver used to outlive both the
  // per-request timeout and a step abort: resolution happens before any connection,
  // which is outside everything else that bounds this function. Hostnames are
  // operator-supplied, so that is a task-worker exhaustion vector.
  it('gives up on a resolver that never answers', async () => {
    const neverResolves = () => new Promise<Array<{ address: string }>>(() => {});

    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: neverResolves,
        timeoutMs: 60,
      })('https://example.com/feed.xml', { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/Timed out or aborted resolving/);
  });

  it('gives up when the caller aborts during resolution', async () => {
    const controller = new AbortController();
    const neverResolves = () => new Promise<Array<{ address: string }>>(() => {});
    setTimeout(() => controller.abort(), 20);

    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: neverResolves,
        timeoutMs: 30_000,
      })('https://example.com/feed.xml', { abortSignal: controller.signal })
    ).rejects.toThrow(/Timed out or aborted resolving/);
  });

  it('rejects immediately when the caller already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('https://example.com/feed.xml', { abortSignal: controller.signal })
    ).rejects.toThrow(/Aborted before resolving/);
  });
});

describe('fetchUrl non-followed 3xx', () => {
  // Fetch only redirects 301/302/303/307/308. Treating every 3xx as a redirect made
  // a 304 answering a caller's conditional headers throw "missing Location".
  it('returns a 304 to the caller instead of demanding a Location', async () => {
    const result = await createFetchUrl({
      fetchFn: (async () => makeResponse(304, { etag: '"abc"' })) as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://example.com/feed.xml', {
      abortSignal: new AbortController().signal,
      headers: { 'If-None-Match': '"abc"' },
    });

    expect(result.status).toBe(304);
    expect(result.headers.etag).toBe('"abc"');
  });

  it('still follows a 308', async () => {
    let hop = 0;
    const fetchFn = jest.fn(async () => {
      hop += 1;
      return hop === 1
        ? makeResponse(308, { location: 'https://example.com/moved.xml' })
        : makeResponse(200, {}, 'ok');
    });

    const result = await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://example.com/feed.xml', { abortSignal: new AbortController().signal });

    expect(result.finalUrl).toBe('https://example.com/moved.xml');
  });
});

describe('fetchUrl redirect body release', () => {
  // The body has to be released before anything throwable, because `finally` calls
  // Agent.close(), which waits on in-flight requests. An unread stream keeps the
  // request in flight, so a server streaming an endless redirect body could hang
  // the run rather than failing it.
  it('releases the redirect body when the destination is unsafe', async () => {
    const { response, cancel } = makeResponseWithBody(302, {
      location: 'https://internal.example/admin',
    });

    await expect(
      createFetchUrl({
        fetchFn: (async () => response) as unknown as typeof fetch,
        lookupFn: async (host: string) =>
          host === 'internal.example' ? [{ address: '10.0.0.5' }] : [{ address: '93.184.216.34' }],
      })('https://example.com/feed.xml', { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/restricted address range/);

    expect(cancel).toHaveBeenCalled();
  });

  it('releases the redirect body when the hop limit is exhausted', async () => {
    const cancels: jest.Mock[] = [];
    const fetchFn = jest.fn(async () => {
      const { response, cancel } = makeResponseWithBody(302, {
        location: 'https://example.com/next',
      });
      cancels.push(cancel);
      return response;
    });

    await expect(
      createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('https://example.com/feed.xml', { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/Exceeded maximum redirect hops/);

    expect(cancels).toHaveLength(6);
    for (const cancel of cancels) expect(cancel).toHaveBeenCalled();
  });

  it('releases the redirect body when Location is missing', async () => {
    const { response, cancel } = makeResponseWithBody(302, {});

    await expect(
      createFetchUrl({
        fetchFn: (async () => response) as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('https://example.com/feed.xml', { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/missing Location header/);

    expect(cancel).toHaveBeenCalled();
  });
});

describe('fetchUrl cross-origin credential stripping', () => {
  const captureHops = (locations: string[]) => {
    const seen: Array<Record<string, string>> = [];
    let hop = 0;
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
      seen.push((init?.headers ?? {}) as Record<string, string>);
      const location = locations[hop];
      hop += 1;
      return location ? makeResponse(302, { location }) : makeResponse(200, {}, 'ok');
    });
    return { fetchFn, seen };
  };

  // Proxy-Authorization is a standard credential header and the public `headers`
  // option can carry it, so a feed host redirecting cross-origin would otherwise
  // receive proxy credentials.
  it.each(['Authorization', 'Proxy-Authorization', 'x-api-key', 'Cookie'])(
    'strips %s on a cross-origin hop',
    async (header) => {
      const { fetchFn, seen } = captureHops(['https://elsewhere.test/feed.xml']);

      await createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('https://example.com/feed.xml', {
        abortSignal: new AbortController().signal,
        headers: { [header]: 'secret-value' },
      });

      expect(seen[0][header]).toBe('secret-value');
      expect(JSON.stringify(seen[1])).not.toContain('secret-value');
    }
  );

  it.each(['Authorization', 'Proxy-Authorization'])(
    'keeps %s on a same-origin hop',
    async (header) => {
      const { fetchFn, seen } = captureHops(['https://example.com/feed-v2.xml']);

      await createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('https://example.com/feed.xml', {
        abortSignal: new AbortController().signal,
        headers: { [header]: 'secret-value' },
      });

      expect(seen[1][header]).toBe('secret-value');
    }
  );
});

describe('fetchUrl cloud platform endpoints', () => {
  it('rejects the Azure platform VIP as a literal host', async () => {
    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('http://168.63.129.16/machine/?comp=goalstate', {
        abortSignal: new AbortController().signal,
      })
    ).rejects.toThrow(/restricted IPv4 address range/);
  });

  it('rejects a hostname that resolves to the Azure platform VIP', async () => {
    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: async () => [{ address: '168.63.129.16' }],
      })('https://feed.example.com/rss', { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/restricted address range/);
  });
});

describe('redactUrl on malformed input', () => {
  // This branch runs *because* the URL did not parse, so it cannot assume valid
  // userinfo syntax. The old pattern stopped at the first `/` and the first `@`, so
  // both of these leaked into an error that may be logged.
  it.each([
    ['userinfo containing a slash', 'ht!tp://user:sec/ret@host/x'],
    ['userinfo containing an at sign', 'ht!tp://us@er:s3cr3t@host/x'],
    ['plain malformed userinfo', 'ht!tp://u:p4ssw0rd@host/x'],
  ])('redacts %s', (_label, raw) => {
    const out = redactUrl(raw);
    expect(out).not.toContain('s3cr3t');
    expect(out).not.toContain('p4ssw0rd');
    expect(out).not.toContain('sec/ret');
    expect(out).not.toContain('@');
  });

  it('leaves a malformed URL without userinfo alone', () => {
    expect(redactUrl('ht!tp://host/x')).toBe('ht!tp://host/x');
  });
});

describe('fetchUrl authorization precedence is case-insensitive', () => {
  const capture = () => {
    const seen: Array<Record<string, string>> = [];
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
      seen.push((init?.headers ?? {}) as Record<string, string>);
      return makeResponse(200, {}, 'ok');
    });
    return { fetchFn, seen };
  };

  // Header names are case-insensitive and fetch normalizes them, so leaving both keys
  // in the object could send the stale URL credential alongside the intended one.
  it.each(['authorization', 'Authorization', 'AUTHORIZATION', 'AuThOrIzAtIoN'])(
    'lets a caller %s replace the URL credential entirely',
    async (headerName) => {
      const { fetchFn, seen } = capture();

      await createFetchUrl({
        fetchFn: fetchFn as unknown as typeof fetch,
        lookupFn: publicLookup,
      })('https://feeduser:s3cret@example.com/feed.xml', {
        abortSignal: new AbortController().signal,
        headers: { [headerName]: 'Bearer explicit' },
      });

      const sent = seen[0];
      const authKeys = Object.keys(sent).filter((k) => k.toLowerCase() === 'authorization');
      expect(authKeys).toHaveLength(1);
      expect(sent[authKeys[0]]).toBe('Bearer explicit');
      expect(JSON.stringify(sent)).not.toContain('s3cret');
    }
  );

  it('still derives the credential when the caller sends no authorization', async () => {
    const { fetchFn, seen } = capture();

    await createFetchUrl({
      fetchFn: fetchFn as unknown as typeof fetch,
      lookupFn: publicLookup,
    })('https://feeduser:s3cret@example.com/feed.xml', {
      abortSignal: new AbortController().signal,
      headers: { Accept: 'text/xml' },
    });

    expect(seen[0].Authorization).toBe(
      `Basic ${Buffer.from('feeduser:s3cret').toString('base64')}`
    );
  });
});

describe('fetchUrl rejects IPv4-translatable literals', () => {
  it.each([
    'http://[::ffff:0:169.254.169.254]/latest/meta-data/',
    'http://[::ffff:0:a9fe:a9fe]/',
    'http://[::ffff:0:7f00:1]/',
  ])('rejects %s', async (url) => {
    await expect(
      createFetchUrl({
        fetchFn: (async () => makeResponse(200)) as unknown as typeof fetch,
        lookupFn: publicLookup,
      })(url, { abortSignal: new AbortController().signal })
    ).rejects.toThrow(/restricted IPv6 address range/);
  });
});
