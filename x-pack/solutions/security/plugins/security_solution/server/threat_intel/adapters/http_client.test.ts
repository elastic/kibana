/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertSafeUrl, assertSafeUrlResolved, fetchUrl, redactUrl } from './http_client';

// ---------------------------------------------------------------------------
// assertSafeUrl — SSRF guard unit tests
// ---------------------------------------------------------------------------

describe('assertSafeUrl', () => {
  it('allows normal public https URL', () => {
    expect(() => assertSafeUrl('https://example.com/feed.xml')).not.toThrow();
  });

  it('allows normal public http URL', () => {
    expect(() => assertSafeUrl('http://example.com/feed.xml')).not.toThrow();
  });

  it('rejects non-http/https scheme', () => {
    expect(() => assertSafeUrl('ftp://example.com/file')).toThrow(/scheme/i);
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow(/scheme/i);
  });

  it('rejects loopback IPv4 (127.0.0.1)', () => {
    expect(() => assertSafeUrl('http://127.0.0.1/secret')).toThrow(/restricted/i);
  });

  it('rejects loopback IPv4 (127.x.x.x subnet)', () => {
    expect(() => assertSafeUrl('http://127.0.0.99/secret')).toThrow(/restricted/i);
  });

  it('rejects cloud IMDS link-local (169.254.169.254)', () => {
    expect(() => assertSafeUrl('http://169.254.169.254/latest/meta-data/')).toThrow(/restricted/i);
  });

  it('rejects RFC-1918 10.x.x.x', () => {
    expect(() => assertSafeUrl('http://10.0.0.1/internal')).toThrow(/restricted/i);
  });

  it('rejects RFC-1918 172.16.x.x', () => {
    expect(() => assertSafeUrl('http://172.16.0.1/internal')).toThrow(/restricted/i);
  });

  it('rejects RFC-1918 172.31.x.x (top of range)', () => {
    expect(() => assertSafeUrl('http://172.31.255.255/internal')).toThrow(/restricted/i);
  });

  it('allows 172.32.x.x (just outside RFC-1918 range)', () => {
    expect(() => assertSafeUrl('http://172.32.0.1/feed')).not.toThrow();
  });

  it('rejects RFC-1918 192.168.x.x', () => {
    expect(() => assertSafeUrl('http://192.168.1.1/internal')).toThrow(/restricted/i);
  });

  it('rejects unspecified 0.0.0.0', () => {
    expect(() => assertSafeUrl('http://0.0.0.0/')).toThrow(/restricted/i);
  });

  it('rejects IPv6 loopback ::1', () => {
    expect(() => assertSafeUrl('http://[::1]/secret')).toThrow(/restricted/i);
  });

  it('rejects IPv6 link-local fe80::', () => {
    expect(() => assertSafeUrl('http://[fe80::1]/secret')).toThrow(/restricted/i);
  });

  it('rejects IPv6 unique-local fc00::', () => {
    expect(() => assertSafeUrl('http://[fc00::1]/secret')).toThrow(/restricted/i);
  });

  it('rejects IPv6 unique-local fd00::', () => {
    expect(() => assertSafeUrl('http://[fd00::1]/secret')).toThrow(/restricted/i);
  });

  it('rejects an invalid URL', () => {
    expect(() => assertSafeUrl('not-a-url')).toThrow(/Invalid URL/i);
  });

  // --- Bypass 1: obfuscated IPv4 encodings ---
  // The WHATWG URL parser normalizes all of these to canonical dotted-quad
  // before our code sees them, so they are caught by the IPv4 range check
  // (not a separate "obfuscated" branch).

  it('rejects decimal-encoded IPv4 (2130706433 → normalized to 127.0.0.1)', () => {
    // URL parser: 2130706433 → 127.0.0.1 → caught by loopback range check
    expect(() => assertSafeUrl('http://2130706433/')).toThrow();
  });

  it('rejects hex-integer IPv4 (0x7f000001 → normalized to 127.0.0.1)', () => {
    // URL parser: 0x7f000001 → 127.0.0.1 → caught by loopback range check
    expect(() => assertSafeUrl('http://0x7f000001/')).toThrow();
  });

  it('rejects hex-dotted IPv4 (0x7f.0.0.1 → normalized to 127.0.0.1)', () => {
    expect(() => assertSafeUrl('http://0x7f.0.0.1/')).toThrow();
  });

  it('rejects octal-dotted IPv4 (0177.0.0.1 → normalized to 127.0.0.1)', () => {
    // URL parser normalizes octal-looking segments to decimal before our check
    expect(() => assertSafeUrl('http://0177.0.0.1/')).toThrow();
  });

  // --- Bypass 2: IPv4-mapped IPv6 ---
  // The WHATWG URL parser canonicalizes the dotted form to hex groups, so
  // ::ffff:169.254.169.254 → ::ffff:a9fe:a9fe (and similar).

  it('rejects IPv4-mapped IPv6 ::ffff:169.254.169.254 (URL parser → ::ffff:a9fe:a9fe)', () => {
    expect(() => assertSafeUrl('http://[::ffff:169.254.169.254]/')).toThrow(/restricted/i);
  });

  it('rejects IPv4-mapped IPv6 ::ffff:a9fe:a9fe (hex groups, IMDS)', () => {
    expect(() => assertSafeUrl('http://[::ffff:a9fe:a9fe]/')).toThrow(/restricted/i);
  });

  it('rejects IPv4-mapped IPv6 ::ffff:127.0.0.1 (URL parser → ::ffff:7f00:1)', () => {
    expect(() => assertSafeUrl('http://[::ffff:127.0.0.1]/')).toThrow(/restricted/i);
  });

  it('rejects IPv4-compatible ::169.254.169.254 (URL parser → ::a9fe:a9fe)', () => {
    expect(() => assertSafeUrl('http://[::169.254.169.254]/')).toThrow(/restricted/i);
  });

  // --- Still allowed: normal public addresses ---

  it('allows a normal public hostname', () => {
    expect(() => assertSafeUrl('https://feeds.example.com/rss')).not.toThrow();
  });

  it('allows a normal public IPv4 literal (93.184.216.34)', () => {
    expect(() => assertSafeUrl('https://93.184.216.34/')).not.toThrow();
  });

  // --- Bypass 3: hostnames that always point somewhere local ---

  it('rejects localhost', () => {
    expect(() => assertSafeUrl('http://localhost:5601/api/status')).toThrow(/restricted/i);
  });

  it('rejects a single-label host (a neighbouring service name)', () => {
    expect(() => assertSafeUrl('http://elasticsearch:9200/_cat/indices')).toThrow(/restricted/i);
  });

  it('rejects metadata.google.internal (GCP metadata server)', () => {
    expect(() => assertSafeUrl('http://metadata.google.internal/computeMetadata/v1/')).toThrow(
      /restricted/i
    );
  });

  it('rejects a .local mDNS host', () => {
    expect(() => assertSafeUrl('http://printer.local/')).toThrow(/restricted/i);
  });

  // --- Bypass 4: IPv4 ranges beyond RFC1918 ---

  it('rejects 0.0.0.0/8 beyond the exact unspecified address', () => {
    expect(() => assertSafeUrl('http://0.0.0.1/')).toThrow(/restricted/i);
  });

  it('rejects carrier-grade NAT 100.64.0.0/10', () => {
    expect(() => assertSafeUrl('http://100.64.0.1/')).toThrow(/restricted/i);
  });

  it('rejects benchmarking range 198.18.0.0/15', () => {
    expect(() => assertSafeUrl('http://198.19.0.1/')).toThrow(/restricted/i);
  });

  it('rejects multicast 224.0.0.0/4', () => {
    expect(() => assertSafeUrl('http://239.255.255.250/')).toThrow(/restricted/i);
  });

  it('allows 100.63.x.x just below the CGNAT block', () => {
    expect(() => assertSafeUrl('http://100.63.0.1/')).not.toThrow();
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

  it('allows a hostname that resolves only to public addresses', async () => {
    await expect(
      assertSafeUrlResolved('https://feed.example.com/rss', async () => [
        { address: '93.184.216.34' },
      ])
    ).resolves.toBeUndefined();
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

  it('keeps credentials out of the invalid-URL error', () => {
    expect(() => assertSafeUrl('ht!tp://svc:s3cr3t@host/x')).toThrow(
      /Invalid URL: ht!tp:\/\/host\/x/
    );
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

/** Every hostname in these tests resolves to a public address. */
const publicLookup = async () => [{ address: '93.184.216.34' }];

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
      fetchUrl('https://example.com/feed', {
        abortSignal: controller.signal,
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        lookupFn: publicLookup,
      })
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

    const result = await fetchUrl('https://example.com/feed', {
      abortSignal: controller.signal,
      fetchFn: fetchFn as unknown as typeof fetch,
      timeoutMs: 1000,
      lookupFn: publicLookup,
    });

    expect(result.body).toBe('<feed/>');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects a redirect to a hostname that resolves to a private address', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () =>
      makeResponse(302, { location: 'https://internal.example.com/' })
    );

    await expect(
      fetchUrl('https://example.com/feed', {
        abortSignal: controller.signal,
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        lookupFn: async (hostname: string) =>
          hostname === 'internal.example.com'
            ? [{ address: '10.0.0.5' }]
            : [{ address: '93.184.216.34' }],
      })
    ).rejects.toThrow(/restricted/i);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchUrl body cap', () => {
  it('enforces the cap on a streaming body', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () =>
      makeStreamingResponse(200, ['a'.repeat(64), 'b'.repeat(64)])
    );

    await expect(
      fetchUrl('https://example.com/feed', {
        abortSignal: controller.signal,
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        maxBytes: 100,
        lookupFn: publicLookup,
      })
    ).rejects.toThrow(/exceeded the 100-byte cap/i);
  });

  it('enforces the cap when the response exposes no stream', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () => makeResponse(200, {}, 'x'.repeat(200)));

    await expect(
      fetchUrl('https://example.com/feed', {
        abortSignal: controller.signal,
        fetchFn: fetchFn as unknown as typeof fetch,
        timeoutMs: 1000,
        maxBytes: 100,
        lookupFn: publicLookup,
      })
    ).rejects.toThrow(/exceeded the 100-byte cap/i);
  });

  it('returns a streamed body that fits under the cap', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(async () => makeStreamingResponse(200, ['<feed', '/>']));

    const result = await fetchUrl('https://example.com/feed', {
      abortSignal: controller.signal,
      fetchFn: fetchFn as unknown as typeof fetch,
      timeoutMs: 1000,
      maxBytes: 100,
      lookupFn: publicLookup,
    });

    expect(result.body).toBe('<feed/>');
  });
});
