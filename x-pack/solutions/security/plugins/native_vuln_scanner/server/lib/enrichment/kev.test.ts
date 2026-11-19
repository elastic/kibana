/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  KEV_FETCH_TIMEOUT_MS,
  KEV_TTL_MS,
  KEV_URL,
  MAX_KEV_BYTES,
  clearKevCache,
  downloadKevCatalog,
  getCachedKev,
  loadKev,
} from './kev';

const fixture = readFileSync(join(__dirname, '__fixtures__', 'kev_catalog_trimmed.json'), 'utf8');

// Jest's global AbortSignal is a polyfill without the static combinators Node provides.
const AbortSignalStatic = AbortSignal as unknown as {
  timeout?: (ms: number) => AbortSignal;
  any?: (signals: AbortSignal[]) => AbortSignal;
};
if (!AbortSignalStatic.timeout) {
  AbortSignalStatic.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error(`timeout after ${ms}ms`)), ms);
    return controller.signal;
  };
}
if (!AbortSignalStatic.any) {
  AbortSignalStatic.any = (signals: AbortSignal[]) => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener('abort', () => controller.abort(signal.reason));
    }
    return controller.signal;
  };
}

/**
 * Jest's global `Response` is a polyfill without a body stream, so the tests build the subset of
 * Node's fetch `Response` that the downloader reads.
 */
const fakeResponse = (
  body: Uint8Array | string | ReadableStream<Uint8Array>,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}
) => {
  const stream =
    body instanceof ReadableStream
      ? body
      : new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(typeof body === 'string' ? Buffer.from(body) : body);
            controller.close();
          },
        });
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    body: stream,
  } as unknown as Response;
};

const respond = (...args: Parameters<typeof fakeResponse>) =>
  jest.fn(async () => fakeResponse(...args)) as unknown as jest.MockedFunction<typeof fetch>;

const LAST_MODIFIED = 'Wed, 18 Nov 2026 19:17:40 GMT';

describe('downloadKevCatalog', () => {
  it('parses the catalog into a map keyed by CVE id', async () => {
    const fetchImpl = respond(fixture, { headers: { 'last-modified': LAST_MODIFIED } });
    const result = await downloadKevCatalog(undefined, undefined, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(KEV_URL, {
      signal: expect.any(AbortSignal),
      headers: undefined,
    });
    if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`);
    expect(result.lastModified).toBe(LAST_MODIFIED);
    expect(result.entries.size).toBe(5);
    expect(result.entries.get('CVE-2021-44228')).toEqual({
      dateAdded: '2021-12-10',
      dueDate: '2021-12-24',
      knownRansomwareCampaignUse: 'Known',
    });
    expect(result.entries.get('CVE-2024-10441')?.knownRansomwareCampaignUse).toBe('Unknown');
    expect(result.entries.has('CVE-1999-0001')).toBe(false);
  });

  it('sends If-Modified-Since and reports not_modified on 304', async () => {
    const fetchImpl = respond('', { status: 304 });
    const result = await downloadKevCatalog(undefined, LAST_MODIFIED, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(KEV_URL, {
      signal: expect.any(AbortSignal),
      headers: { 'if-modified-since': LAST_MODIFIED },
    });
    expect(result).toEqual({ status: 'not_modified', lastModified: LAST_MODIFIED });
  });

  it('warns and skips enrichment when count does not match the entries', async () => {
    const catalog = JSON.parse(fixture);
    catalog.count = catalog.vulnerabilities.length + 1;
    const logger = { warn: jest.fn() };
    const result = await downloadKevCatalog(undefined, undefined, {
      fetchImpl: respond(JSON.stringify(catalog)),
      logger,
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'KEV catalog count 6 does not match its 5 entries',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('count 6'));
  });

  it('treats a body that is not JSON as unavailable', async () => {
    const result = await downloadKevCatalog(undefined, undefined, {
      fetchImpl: respond('<html>blocked</html>'),
    });
    expect(result).toEqual({
      status: 'unavailable',
      reason: expect.stringContaining('not valid JSON'),
    });
  });

  it('rejects a catalog whose entry lacks a cveID', async () => {
    const body = JSON.stringify({ count: 1, vulnerabilities: [{ dateAdded: '2026-01-01' }] });
    const result = await downloadKevCatalog(undefined, undefined, { fetchImpl: respond(body) });
    expect(result.status).toBe('unavailable');
  });

  it('refuses a declared size over the cap without reading the body', async () => {
    const response = fakeResponse(fixture, {
      headers: { 'content-length': String(MAX_KEV_BYTES + 1) },
    });
    const cancel = jest.spyOn(response.body as ReadableStream, 'cancel');
    const result = await downloadKevCatalog(undefined, undefined, {
      fetchImpl: jest.fn(async () => response) as unknown as typeof fetch,
    });

    expect(result).toEqual({ status: 'unavailable', reason: expect.stringContaining('is over') });
    expect(cancel).toHaveBeenCalled();
  });

  it('stops reading a streamed body that passes the cap without a content-length', async () => {
    let sent = 0;
    const pulled = { count: 0 };
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled.count++;
        if (sent++ >= 100) controller.close();
        else controller.enqueue(new Uint8Array(MAX_KEV_BYTES / 4));
      },
    });
    const result = await downloadKevCatalog(undefined, undefined, { fetchImpl: respond(stream) });

    expect(result).toEqual({ status: 'unavailable', reason: expect.stringContaining('is over') });
    // The 5th chunk crosses the cap; reading stops long before the 100 offered.
    expect(pulled.count).toBeLessThan(10);
  });

  it.each([
    ['a dueDate that is not a date', { dateAdded: '2026-01-01', dueDate: 'TBD' }],
    ['a month and day out of range', { dateAdded: '2026-13-45', dueDate: '2026-02-01' }],
    ['a day the month does not have', { dateAdded: '2026-02-01', dueDate: '2026-02-30' }],
    ['a date with a time part', { dateAdded: '2026-01-01T00:00:00Z', dueDate: '2026-02-01' }],
  ])('marks the whole catalog unavailable for %s', async (_name, dates) => {
    const body = JSON.stringify({
      count: 2,
      vulnerabilities: [
        {
          cveID: 'CVE-2026-0001',
          dateAdded: '2026-01-01',
          dueDate: '2026-01-22',
          knownRansomwareCampaignUse: 'Unknown',
        },
        { cveID: 'CVE-2026-0002', ...dates, knownRansomwareCampaignUse: 'Unknown' },
      ],
    });
    const result = await downloadKevCatalog(undefined, undefined, { fetchImpl: respond(body) });
    expect(result).toEqual({
      status: 'unavailable',
      reason: expect.stringContaining('CVE-2026-0002'),
    });
  });

  it('combines the workflow signal with its own timeout', async () => {
    const fetchImpl = respond(fixture);
    const controller = new AbortController();
    await downloadKevCatalog(controller.signal, undefined, { fetchImpl });

    const { signal } = (fetchImpl as jest.Mock).mock.calls[0][1] as { signal: AbortSignal };
    expect(signal).not.toBe(controller.signal);
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it('returns unavailable when the download outlives the timeout', async () => {
    expect(KEV_FETCH_TIMEOUT_MS).toBe(60_000);
    const fetchImpl = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    ) as unknown as typeof fetch;

    const result = await downloadKevCatalog(undefined, undefined, { fetchImpl, timeoutMs: 20 });
    expect(result.status).toBe('unavailable');
  });

  it('returns unavailable on an HTTP error', async () => {
    const result = await downloadKevCatalog(undefined, undefined, {
      fetchImpl: respond('', { status: 503 }),
    });
    expect(result).toEqual({ status: 'unavailable', reason: 'KEV catalog returned HTTP 503' });
  });

  it('returns unavailable instead of throwing on a network failure', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('getaddrinfo ENOTFOUND www.cisa.gov');
    }) as unknown as typeof fetch;
    const result = await downloadKevCatalog(undefined, undefined, { fetchImpl });
    expect(result).toEqual({
      status: 'unavailable',
      reason: 'getaddrinfo ENOTFOUND www.cisa.gov',
    });
  });
});

describe('loadKev', () => {
  beforeEach(() => clearKevCache());

  it('serves the cached catalog within the TTL without another request', async () => {
    const fetchImpl = respond(fixture, { headers: { 'last-modified': LAST_MODIFIED } });
    let nowMs = 1_000;
    const options = { fetchImpl, now: () => nowMs };

    const first = await loadKev(undefined, options);
    nowMs += KEV_TTL_MS - 1;
    const second = await loadKev(undefined, options);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(getCachedKev(nowMs)?.lastModified).toBe(LAST_MODIFIED);
  });

  it('revalidates with If-Modified-Since once the TTL has expired and keeps the cache on 304', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(fakeResponse(fixture, { headers: { 'last-modified': LAST_MODIFIED } }))
      .mockResolvedValueOnce(fakeResponse('', { status: 304 })) as unknown as typeof fetch;
    let nowMs = 1_000;
    const options = { fetchImpl, now: () => nowMs };

    const first = await loadKev(undefined, options);
    nowMs += KEV_TTL_MS;
    expect(getCachedKev(nowMs)).toBeUndefined();
    const second = await loadKev(undefined, options);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect((fetchImpl as jest.Mock).mock.calls[1][1].headers).toEqual({
      'if-modified-since': LAST_MODIFIED,
    });
    expect(second).toEqual(first);
    // The 304 renewed the TTL.
    expect(getCachedKev(nowMs + KEV_TTL_MS - 1)).toBeDefined();
  });

  it('replaces the cache when the catalog changed after the TTL', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(fakeResponse(fixture))
      .mockResolvedValueOnce(
        fakeResponse(
          JSON.stringify({
            count: 1,
            vulnerabilities: [
              {
                cveID: 'CVE-2026-0001',
                dateAdded: '2026-11-19',
                dueDate: '2026-12-10',
                knownRansomwareCampaignUse: 'Unknown',
              },
            ],
          })
        )
      ) as unknown as typeof fetch;
    let nowMs = 0;
    const options = { fetchImpl, now: () => nowMs };

    await loadKev(undefined, options);
    nowMs += KEV_TTL_MS;
    const refreshed = await loadKev(undefined, options);

    if (refreshed.status !== 'ok') throw new Error('expected ok');
    expect([...refreshed.entries.keys()]).toEqual(['CVE-2026-0001']);
  });

  it('does not cache an unavailable result', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(fakeResponse('', { status: 500 }))
      .mockResolvedValueOnce(fakeResponse(fixture)) as unknown as typeof fetch;

    expect((await loadKev(undefined, { fetchImpl })).status).toBe('unavailable');
    expect((await loadKev(undefined, { fetchImpl })).status).toBe('ok');
  });

  it('serves the expired entries as stale when the refresh fails', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(fakeResponse(fixture, { headers: { 'last-modified': LAST_MODIFIED } }))
      .mockRejectedValueOnce(
        new Error('getaddrinfo ENOTFOUND www.cisa.gov')
      ) as unknown as typeof fetch;
    let nowMs = 1_000;
    const options = { fetchImpl, now: () => nowMs };

    const first = await loadKev(undefined, options);
    nowMs += KEV_TTL_MS;
    const second = await loadKev(undefined, options);

    if (first.status !== 'ok') throw new Error('expected ok');
    expect(second).toEqual({
      status: 'stale',
      entries: first.entries,
      reason: 'getaddrinfo ENOTFOUND www.cisa.gov',
    });
  });

  it('keeps retrying the download on later scans while serving stale entries', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(fakeResponse(fixture))
      .mockResolvedValueOnce(fakeResponse('', { status: 503 }))
      .mockResolvedValueOnce(fakeResponse(fixture)) as unknown as typeof fetch;
    let nowMs = 0;
    const options = { fetchImpl, now: () => nowMs };

    await loadKev(undefined, options);
    nowMs += KEV_TTL_MS;
    expect((await loadKev(undefined, options)).status).toBe('stale');
    expect((await loadKev(undefined, options)).status).toBe('ok');
  });
});
