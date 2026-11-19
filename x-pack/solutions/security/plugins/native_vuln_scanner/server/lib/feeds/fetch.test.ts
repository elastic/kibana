/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { zstdCompressSync } from 'zlib';
import { bunzip2Blocks } from './bzip2';
import { readJsonDocuments } from './json';
import {
  bodyToLineIterable,
  CSAF_ARCHIVE_TIMEOUT_MS,
  CSAF_BODY_SLICE_BYTES,
  FEED_DOWNLOAD_TIMEOUT_MS,
  CSAF_REQUEST_TIMEOUT_MS,
  downloadFeed,
  feedUrl,
  loadFeed,
  MAX_FEED_BYTES,
  parseFeedBody,
  REDHAT_CSAF_ARCHIVE_LATEST_URL,
  REDHAT_CSAF_CHANGES_URL,
} from './fetch';

jest.mock('./bzip2', () => {
  const actual = jest.requireActual('./bzip2');
  return { ...actual, bunzip2Blocks: jest.fn(actual.bunzip2Blocks) };
});

const csafFixture = readFileSync(join(__dirname, '__fixtures__', 'csaf_rhel10_trimmed.json'));
const rhelBz2 = readFileSync(join(__dirname, '__fixtures__', 'rhel_9_trimmed.oval.xml.bz2'));

/**
 * Jest's global `Response` is a polyfill without a body stream, so the tests build the subset of
 * Node's fetch `Response` that `loadFeed` reads.
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

/** A body that streams `chunks` chunks of `size` bytes without declaring a content-length. */
const streamOf = (chunks: number, size: number) => {
  let sent = 0;
  const pulled = { count: 0 };
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled.count++;
      if (sent++ >= chunks) controller.close();
      else controller.enqueue(new Uint8Array(size));
    },
  });
  return { stream, pulled };
};

describe('feedUrl', () => {
  it('builds the vendor URLs', () => {
    expect(feedUrl({ family: 'ubuntu', version: 'noble' })).toBe(
      'https://security-metadata.canonical.com/oval/com.ubuntu.noble.cve.oval.xml.bz2'
    );
    expect(feedUrl({ family: 'rhel', version: '9' })).toBe(
      'https://security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2'
    );
  });

  it('switches RHEL to the including-unpatched feed when unfixed rows are wanted', () => {
    expect(feedUrl({ family: 'rhel', version: '9' }, { includeUnfixed: true })).toBe(
      'https://security.access.redhat.com/data/oval/v2/RHEL9/rhel-9-including-unpatched.oval.xml.bz2'
    );
    // Ubuntu has one combined feed; the flag changes nothing there.
    expect(feedUrl({ family: 'ubuntu', version: 'noble' }, { includeUnfixed: true })).toBe(
      'https://security-metadata.canonical.com/oval/com.ubuntu.noble.cve.oval.xml.bz2'
    );
  });

  it.each([
    ['ubuntu', '../noble'],
    ['ubuntu', 'noble?x=1'],
    ['ubuntu', ''],
    ['rhel', '9.4'],
    ['rhel', '0'],
    ['rhel', '9/../8'],
  ] as const)('rejects host-reported release %s %j', (family, version) => {
    expect(() => feedUrl({ family, version })).toThrow('No advisory feed');
  });
});

describe('loadFeed', () => {
  const rhel9 = { family: 'rhel', version: '9' } as const;

  it('downloads, decompresses and parses the feed, passing the abort signal', async () => {
    const fetchImpl = respond(rhelBz2);
    const { signal } = new AbortController();
    const result = await loadFeed(rhel9, { signal, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(feedUrl(rhel9), { signal, headers: undefined });
    if (result.status !== 'ok') throw new Error(`unexpected ${result.status}`);
    expect(result.feed.os).toEqual({ family: 'rhel', version: '9' });
    expect(result.feed.definitions).toBe(5);
    expect(result.feed.records.length).toBeGreaterThan(0);
  });

  it('reports a release with no published feed as unavailable', async () => {
    const result = await loadFeed(
      { family: 'rhel', version: '10' },
      { fetchImpl: respond('Not Found', { status: 404 }) }
    );
    expect(result).toEqual({
      status: 'unavailable',
      url: REDHAT_CSAF_ARCHIVE_LATEST_URL,
    });
  });

  it('throws on other HTTP errors', async () => {
    await expect(loadFeed(rhel9, { fetchImpl: respond('busy', { status: 503 }) })).rejects.toThrow(
      'returned HTTP 503'
    );
  });

  it('refuses a declared size over the cap without reading the body', async () => {
    const { stream, pulled } = streamOf(1, 16);
    const fetchImpl = respond(stream, {
      headers: { 'content-length': String(MAX_FEED_BYTES + 1) },
    });
    await expect(loadFeed(rhel9, { fetchImpl })).rejects.toThrow(`over ${MAX_FEED_BYTES} bytes`);
    expect(pulled.count).toBeLessThanOrEqual(1);
  });

  it('stops reading an undeclared body once it passes the cap', async () => {
    const chunk = 1024 * 1024;
    const { stream, pulled } = streamOf(MAX_FEED_BYTES / chunk + 10, chunk);
    await expect(loadFeed(rhel9, { fetchImpl: respond(stream) })).rejects.toThrow(
      `over ${MAX_FEED_BYTES} bytes`
    );
    expect(pulled.count).toBeLessThan(MAX_FEED_BYTES / chunk + 5);
  });

  it('propagates an abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = jest.fn(async (_url: unknown, init?: RequestInit) => {
      init?.signal?.throwIfAborted();
      return fakeResponse(rhelBz2);
    }) as unknown as typeof fetch;
    await expect(loadFeed(rhel9, { signal: controller.signal, fetchImpl })).rejects.toThrow();
  });

  describe('a body that stalls after the headers', () => {
    const stalledBody = () => {
      let cancelled = false;
      let sent = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!sent) {
            sent = true;
            controller.enqueue(rhelBz2.subarray(0, 16));
            return undefined;
          }
          return new Promise<void>(() => {});
        },
        cancel() {
          cancelled = true;
        },
      });
      const fetchImpl = jest.fn(async () => fakeResponse(stream)) as unknown as typeof fetch;
      return { fetchImpl, wasCancelled: () => cancelled };
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects promptly when the caller aborts mid-body, cancelling the reader', async () => {
      const { fetchImpl, wasCancelled } = stalledBody();
      const controller = new AbortController();
      const reason = new Error('caller gave up');
      const result = downloadFeed(rhel9, { fetchImpl, signal: controller.signal });
      const settled = expect(result).rejects.toBe(reason);
      await jest.advanceTimersByTimeAsync(1000);
      controller.abort(reason);
      await settled;
      expect(wasCancelled()).toBe(true);
    });

    it('rejects with a TimeoutError when the deadline fires, cancelling the reader', async () => {
      const { fetchImpl, wasCancelled } = stalledBody();
      const result = downloadFeed(rhel9, { fetchImpl });
      const settled = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(FEED_DOWNLOAD_TIMEOUT_MS + 1000);
      await settled;
      expect(wasCancelled()).toBe(true);
    });
  });

  it('refuses a feed that decompresses past the decompressed cap', async () => {
    const fetchImpl = respond(rhelBz2);
    await expect(loadFeed(rhel9, { fetchImpl, maxDecompressedBytes: 8 })).rejects.toThrow(
      'decompresses past 8 bytes'
    );
  });

  it('stops decompressing when the signal aborts mid-parse', async () => {
    const controller = new AbortController();
    const xml = readFileSync(join(__dirname, '__fixtures__', 'rhel_9_trimmed.oval.xml'));
    const third = Math.ceil(xml.length / 3);
    const decoded: number[] = [];
    // The signal aborts while block 1 is being produced, after block 0 was already parsed.
    (bunzip2Blocks as jest.Mock).mockImplementationOnce(function* blocks() {
      for (const i of [0, 1, 2]) {
        decoded.push(i);
        if (i === 1) controller.abort();
        yield xml.subarray(i * third, (i + 1) * third);
      }
    });
    await expect(
      loadFeed(rhel9, { signal: controller.signal, fetchImpl: respond(rhelBz2) })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(decoded).toEqual([0, 1]);
  });

  it('rejects when the signal is already aborted before the first block', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn(async () => {
      controller.abort();
      return fakeResponse(rhelBz2);
    }) as unknown as typeof fetch;
    await expect(loadFeed(rhel9, { signal: controller.signal, fetchImpl })).rejects.toThrow();
  });
});

describe('downloadFeed', () => {
  const rhel9 = { family: 'rhel', version: '9' } as const;

  it('reports the validators the vendor sent', async () => {
    const result = await downloadFeed(rhel9, {
      fetchImpl: respond(rhelBz2, {
        headers: { etag: '"abc"', 'last-modified': 'Fri, 13 Nov 2026 10:00:00 GMT' },
      }),
    });
    expect(result).toMatchObject({
      status: 'ok',
      etag: '"abc"',
      lastModified: 'Fri, 13 Nov 2026 10:00:00 GMT',
    });
  });

  it('sends a known etag as If-None-Match and reports a 304 without reading a body', async () => {
    const fetchImpl = respond('', { status: 304, headers: { etag: '"abc"' } });
    const result = await downloadFeed(rhel9, { fetchImpl, etag: '"abc"' });
    expect(fetchImpl).toHaveBeenCalledWith(feedUrl(rhel9), {
      signal: expect.any(AbortSignal),
      headers: { 'if-none-match': '"abc"' },
    });
    expect(result).toEqual({ status: 'not_modified', etag: '"abc"', lastModified: undefined });
  });

  it('keeps the known etag when a 304 omits it', async () => {
    const result = await downloadFeed(rhel9, {
      fetchImpl: respond('', { status: 304 }),
      etag: '"known"',
    });
    expect(result).toMatchObject({ status: 'not_modified', etag: '"known"' });
  });
});

describe('loadFeed validators', () => {
  const rhel9 = { family: 'rhel', version: '9' } as const;

  it('returns the etag alongside the parsed feed', async () => {
    const result = await loadFeed(rhel9, {
      fetchImpl: respond(rhelBz2, { headers: { etag: '"v1"' } }),
    });
    expect(result).toMatchObject({ status: 'ok', etag: '"v1"' });
  });

  it('refuses a 304 to an unconditional request', async () => {
    await expect(loadFeed(rhel9, { fetchImpl: respond('', { status: 304 }) })).rejects.toThrow(
      'answered 304 to an unconditional request'
    );
  });
});

describe('parseFeedBody', () => {
  it('parses a downloaded body', async () => {
    const feed = await parseFeedBody({ family: 'rhel', version: '9' }, rhelBz2);
    expect(feed.definitions).toBe(5);
  });

  it('uses the larger decompressed cap for the RHEL unpatched feed', async () => {
    const { MAX_DECOMPRESSED_FEED_BYTES, MAX_DECOMPRESSED_UNPATCHED_FEED_BYTES } =
      jest.requireActual('./fetch');
    expect(MAX_DECOMPRESSED_UNPATCHED_FEED_BYTES).toBeGreaterThan(MAX_DECOMPRESSED_FEED_BYTES);
    // The effective cap is observable through the guard's refusal message.
    await expect(
      parseFeedBody({ family: 'rhel', version: '9' }, rhelBz2, {
        maxDecompressedBytes: 8,
        includeUnfixed: true,
      })
    ).rejects.toThrow('decompresses past 8 bytes');
    await expect(
      parseFeedBody({ family: 'rhel', version: '9' }, rhelBz2, { maxDecompressedBytes: 8 })
    ).rejects.toThrow('decompresses past 8 bytes');
  });
});

describe('RHEL 10+ via CSAF', () => {
  const rhel10 = { family: 'rhel', version: '10' } as const;
  const base = REDHAT_CSAF_ARCHIVE_LATEST_URL.slice(
    0,
    REDHAT_CSAF_ARCHIVE_LATEST_URL.lastIndexOf('/') + 1
  );
  const archiveName = 'csaf_advisories_2026-11-08.tar.zst';
  const archiveUrl = `${base}${archiveName}`;
  const builtAt = 'Sun, 08 Nov 2026 11:22:30 GMT';

  /** A tiny ustar entry writer; Red Hat's archive is plain ustar. */
  const tarEntry = (path: string, data: Buffer): Buffer => {
    const header = Buffer.alloc(512);
    header.write(path.slice(0, 100), 0, 'utf8');
    header.write(('0000' + (0o644).toString(8)).slice(-7), 100); // mode
    header.write(('0000' + (0o0).toString(8)).slice(-7), 108); // uid
    header.write(('0000' + (0o0).toString(8)).slice(-7), 116); // gid
    header.write((data.length.toString(8) + '\0').padStart(12, '0'), 124); // size
    header.write('0'.padStart(12, '0'), 136); // mtime
    header.write('        ', 148); // checksum placeholder (spaces)
    header.write('0', 156); // typeflag: regular file
    header.write('ustar\0', 257);
    header.write('00', 263);
    let sum = 0;
    for (const b of header) sum += b;
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    const pad = (512 - (data.length % 512)) % 512;
    return Buffer.concat([header, data, Buffer.alloc(pad)]);
  };

  const zstdCompress = (data: Buffer): Buffer => zstdCompressSync(data);

  const el10Doc = Buffer.from(`{"cpe":"cpe:/o:redhat:enterprise_linux:10","id":"in-archive"}`);

  const changesCsv = (rows: Array<[string, string]>): string =>
    rows.map(([p, t]) => `"${p}","${t}"`).join('\n') + '\n';

  /**
   * A fake Red Hat CSAF site: archive_latest.txt, the archive (HEAD + GET), changes.csv and
   * per-advisory documents, keyed by path.
   */
  const csafServer = (
    entries: Array<{ path: string; data: Buffer }>,
    {
      changes = '',
      docs = {},
      lastModified = builtAt,
    }: { changes?: string; docs?: Record<string, Buffer | string>; lastModified?: string } = {}
  ) =>
    jest.fn(async (url: string, init?: { method?: string }) => {
      if (url === REDHAT_CSAF_ARCHIVE_LATEST_URL) return fakeResponse(`${archiveName}\n`);
      if (url === archiveUrl && init?.method === 'HEAD')
        return fakeResponse('', { headers: { 'last-modified': lastModified } });
      if (url === archiveUrl)
        return fakeResponse(
          zstdCompress(Buffer.concat(entries.map((e) => tarEntry(e.path, e.data))))
        );
      if (url === REDHAT_CSAF_CHANGES_URL) return fakeResponse(changes);
      const path = url.slice(base.length);
      const doc = docs[path];
      return doc === undefined ? fakeResponse('missing', { status: 404 }) : fakeResponse(doc);
    }) as unknown as jest.MockedFunction<typeof fetch>;

  const jsonDocs = (body: Uint8Array): Array<{ id: string }> =>
    JSON.parse(Buffer.from(body).toString('utf8'));

  it('builds the archive-latest URL as the feed URL', () => {
    expect(feedUrl(rhel10)).toBe(REDHAT_CSAF_ARCHIVE_LATEST_URL);
    expect(feedUrl({ family: 'rhel', version: '9' })).not.toBe(REDHAT_CSAF_ARCHIVE_LATEST_URL);
  });

  it('streams the archive, filters by year and major substring, and parses end to end', async () => {
    const otherMajor = Buffer.from('{"cpe":"cpe:/o:redhat:enterprise_linux:9","id":"el9"}');
    const fetchImpl = csafServer([
      { path: '2023/rhsa-2023_0001.json', data: el10Doc },
      { path: 'not-a-doc.txt', data: el10Doc },
      { path: '2026/rhsa-2026_1.json', data: otherMajor },
      { path: '2026/rhba-2026_21388.json', data: csafFixture },
    ]);
    const result = await loadFeed(rhel10, { fetchImpl });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.feed.os).toEqual({ family: 'rhel', version: '10' });
    // The fixture parses to 1 definition / 3 package records.
    expect(result.feed.definitions).toBe(1);
    expect(result.feed.records).toHaveLength(3);
    // Archive GET'd exactly once (plus a HEAD), streamed.
    expect(
      fetchImpl.mock.calls.filter(([u, init]) => u === archiveUrl && !init?.method)
    ).toHaveLength(1);
  });

  it('adds delta advisories from changes.csv and skips ones already in the archive', async () => {
    const newerDoc = Buffer.from('{"cpe":"cpe:/o:redhat:enterprise_linux:10","id":"newer"}');
    const olderDoc = Buffer.from('{"cpe":"cpe:/o:redhat:enterprise_linux:10","id":"older"}');
    const fetchImpl = csafServer([{ path: '2026/in-archive.json', data: el10Doc }], {
      changes: changesCsv([
        ['2026/newer.json', '2026-11-18T10:00:00Z'], // after the archive: fetched
        ['2026/in-archive.json', '2026-11-18T10:00:00Z'], // in the archive: not fetched
        ['2026/older.json', '2026-11-01T10:00:00Z'], // before the archive: not fetched
        ['2023/old.json', '2026-11-18T10:00:00Z'], // before the first year: not fetched
      ]),
      docs: {
        '2026/newer.json': newerDoc,
        '2026/older.json': olderDoc,
        '2023/old.json': el10Doc,
      },
    });
    const result = await downloadFeed(rhel10, { fetchImpl });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(
      jsonDocs(result.body)
        .map((d) => (d as { id: string }).id)
        .sort()
    ).toEqual(['in-archive', 'newer']);
    expect(fetchImpl).not.toHaveBeenCalledWith(`${base}2026/older.json`, expect.anything());
    expect(fetchImpl).not.toHaveBeenCalledWith(`${base}2023/old.json`, expect.anything());
  });

  it('uses the archive alone with a warning when the true delta is over the cap', async () => {
    // 1501 paths NOT in the archive; in-archive republished paths do not count toward the cap.
    const rows = Array.from({ length: 1501 }, (_, i): [string, string] => [
      `2026/rhsa-2026_${10000 + i}.json`,
      '2026-11-18T10:00:00Z',
    ]);
    const entries = [
      { path: '2026/in-archive.json', data: el10Doc },
      // Plus 2000 in-archive republished paths: churn, but the true delta stays 1501.
      ...Array.from({ length: 2000 }, (_, i) => ({
        path: `2026/rhsa-2026_${50000 + i}.json`,
        data: el10Doc,
      })),
    ];
    const fetchImpl = csafServer(entries, {
      changes: changesCsv([
        ...rows,
        ...Array.from({ length: 2000 }, (_, i): [string, string] => [
          `2026/rhsa-2026_${50000 + i}.json`,
          '2026-11-18T10:00:00Z',
        ]),
      ]),
    });
    const warn = jest.fn();
    const result = await downloadFeed(rhel10, { fetchImpl, logger: { warn } });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('over 1500'));
    expect(jsonDocs(result.body).length).toBe(2001);
    expect(result.etag).toBe(`${archiveName}:archive-only`);
    // No per-advisory delta fetch happened.
    expect(
      fetchImpl.mock.calls.filter(
        ([u]) => String(u).startsWith(base) && String(u).endsWith('.json')
      )
    ).toHaveLength(0);
  });

  it('keeps the archive-only etag stable across changes.csv churn', async () => {
    const over = changesCsv(
      Array.from({ length: 1501 }, (_, i): [string, string] => [
        `2026/rhsa-2026_${10000 + i}.json`,
        '2026-11-18T10:00:00Z',
      ])
    );
    const fetchImpl = csafServer([{ path: '2026/in-archive.json', data: el10Doc }], {
      changes: over,
    });
    const first = await downloadFeed(rhel10, { fetchImpl });
    expect(first.status).toBe('ok');
    if (first.status !== 'ok') return;
    // Churn: 200 more changed paths, same archive.
    const churned = csafServer([{ path: '2026/in-archive.json', data: el10Doc }], {
      changes: changesCsv([
        ...Array.from({ length: 1501 }, (_, i): [string, string] => [
          `2026/rhsa-2026_${10000 + i}.json`,
          '2026-11-18T10:00:00Z',
        ]),
        ...Array.from({ length: 200 }, (_, i): [string, string] => [
          `2026/rhsa-2026_${90000 + i}.json`,
          '2026-11-19T10:00:00Z',
        ]),
      ]),
    });
    const second = await downloadFeed(rhel10, { fetchImpl: churned, etag: first.etag });
    // Archive-only identity does not depend on the churn set; deltas are never fetched.
    expect(
      churned.mock.calls.filter(([u]) => String(u).startsWith(base) && String(u).endsWith('.json'))
    ).toHaveLength(0);
    expect(second.status).toBe('not_modified');
    // No archive body is handed back for the unchanged archive-only identity.
    expect(second).not.toHaveProperty('body');
    expect(second).toMatchObject({ etag: `${archiveName}:archive-only` });
  });

  describe('archive body stalls and aborts', () => {
    /** Serves the archive as one valid chunk, then a body whose next pull never resolves. */
    const stalledServer = () => {
      const archive = zstdCompress(tarEntry('2026/in-archive.json', el10Doc));
      const half = archive.subarray(0, Math.max(1, Math.floor(archive.length / 2)));
      let cancelled = false;
      let sent = false;
      const stalled = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!sent) {
            sent = true;
            controller.enqueue(half);
            return undefined;
          }
          return new Promise<void>(() => {});
        },
        cancel() {
          cancelled = true;
        },
      });
      const fetchImpl = jest.fn(async (url: string, init?: { method?: string }) => {
        if (url === REDHAT_CSAF_ARCHIVE_LATEST_URL) return fakeResponse(`${archiveName}\n`);
        if (url === archiveUrl && init?.method === 'HEAD')
          return fakeResponse('', { headers: { 'last-modified': builtAt } });
        if (url === archiveUrl) return fakeResponse(stalled);
        if (url === REDHAT_CSAF_CHANGES_URL) return fakeResponse('');
        return fakeResponse('missing', { status: 404 });
      }) as unknown as jest.MockedFunction<typeof fetch>;
      return { fetchImpl, wasCancelled: () => cancelled };
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects with a TimeoutError when the archive body stalls past the deadline', async () => {
      const { fetchImpl, wasCancelled } = stalledServer();
      const result = downloadFeed(rhel10, { fetchImpl });
      const settled = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(CSAF_ARCHIVE_TIMEOUT_MS + 1000);
      await settled;
      expect(wasCancelled()).toBe(true);
    });

    it('rejects promptly when the caller aborts mid-walk', async () => {
      const { fetchImpl, wasCancelled } = stalledServer();
      const controller = new AbortController();
      const result = downloadFeed(rhel10, { fetchImpl, signal: controller.signal });
      const reason = new Error('caller gave up');
      const settled = expect(result).rejects.toBe(reason);
      await jest.advanceTimersByTimeAsync(1000);
      controller.abort(reason);
      await settled;
      expect(wasCancelled()).toBe(true);
    });
  });

  it('skips an oversized archive entry, counting it instead of throwing', async () => {
    const oversized = Buffer.concat([el10Doc, Buffer.alloc(33 * 1024 * 1024)]);
    const warn = jest.fn();
    const fetchImpl = csafServer([
      { path: '2026/oversized.json', data: oversized },
      { path: '2026/ok.json', data: el10Doc },
    ]);
    const result = await downloadFeed(rhel10, { fetchImpl, logger: { warn } });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(jsonDocs(result.body).map((d) => d.id)).toEqual(['in-archive']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipped 1 advisories'));
  });

  it('skips a delta advisory that returns 404', async () => {
    const fetchImpl = csafServer([{ path: '2026/in-archive.json', data: el10Doc }], {
      changes: changesCsv([['2026/gone.json', '2026-11-18T10:00:00Z']]),
    });
    const warn = jest.fn();
    const result = await downloadFeed(rhel10, { fetchImpl, logger: { warn } });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(jsonDocs(result.body).map((d) => d.id)).toEqual(['in-archive']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('404'));
  });

  it('reports a missing archive_latest.txt as unavailable', async () => {
    const result = await downloadFeed(rhel10, {
      fetchImpl: respond('Not Found', { status: 404 }),
    });
    expect(result).toEqual({ status: 'unavailable', url: REDHAT_CSAF_ARCHIVE_LATEST_URL });
  });

  it('throws on an archive HTTP error', async () => {
    const fetchImpl = jest.fn(async (url: string, init?: { method?: string }) =>
      url === REDHAT_CSAF_ARCHIVE_LATEST_URL
        ? fakeResponse(archiveName)
        : url === archiveUrl && init?.method !== 'HEAD'
        ? fakeResponse('busy', { status: 503 })
        : fakeResponse('')
    ) as unknown as jest.MockedFunction<typeof fetch>;
    await expect(downloadFeed(rhel10, { fetchImpl })).rejects.toThrow('returned HTTP 503');
  });

  it('answers not_modified when the true delta is unchanged, without fetching delta docs', async () => {
    const newerDoc = Buffer.from('{"cpe":"cpe:/o:redhat:enterprise_linux:10","id":"newer"}');
    const changes = changesCsv([['2026/newer.json', '2026-11-18T10:00:00Z']]);
    const fetchImpl = csafServer([], { changes, docs: { '2026/newer.json': newerDoc } });
    const first = await downloadFeed(rhel10, { fetchImpl });
    expect(first.status).toBe('ok');
    if (first.status !== 'ok') return;
    expect(jsonDocs(first.body).map((d) => d.id)).toEqual(['newer']);
    const second = await downloadFeed(rhel10, { fetchImpl, etag: first.etag });
    expect(second).toMatchObject({ status: 'not_modified', etag: first.etag });
    // The delta advisory is fetched exactly once (first run only).
    expect(fetchImpl.mock.calls.filter(([u]) => u === `${base}2026/newer.json`)).toHaveLength(1);
  });

  it('passes a timeout-bounded abort signal to every request', async () => {
    const fetchImpl = csafServer([{ path: '2026/in-archive.json', data: el10Doc }]);
    await downloadFeed(rhel10, { fetchImpl, signal: new AbortController().signal });
    for (const [url, init] of fetchImpl.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect((init?.signal as AbortSignal).aborted).toBe(false);
      expect(url).toMatch(/^https:/);
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      archiveUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('rejects when a request never settles, timing out without aborting the caller signal', async () => {
    jest.useFakeTimers();
    try {
      const controller = new AbortController();
      const never = jest.fn(
        () => new Promise<Response>(() => undefined)
      ) as unknown as jest.MockedFunction<typeof fetch>;
      const pending = downloadFeed(rhel10, { fetchImpl: never, signal: controller.signal });
      const rejection = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(CSAF_REQUEST_TIMEOUT_MS);
      await rejection;
      // The deadline fired, not the caller's signal.
      expect(controller.signal.aborted).toBe(false);
      expect(never).toHaveBeenCalledWith(
        REDHAT_CSAF_ARCHIVE_LATEST_URL,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    } finally {
      jest.useRealTimers();
    }
  });

  describe('re-parsing a cached corpus in slices', () => {
    const collectDocs = async (body: Uint8Array): Promise<unknown[]> => {
      const docs: unknown[] = [];
      await readJsonDocuments(bodyToLineIterable(body), { onDocument: (d) => docs.push(d) });
      return docs;
    };

    it('yields bounded slices that together cover the body', () => {
      const body = Buffer.alloc(CSAF_BODY_SLICE_BYTES * 2 + 5, 1);
      const slices = [...bodyToLineIterable(body)];
      expect(slices.map((s) => s.byteLength)).toEqual([
        CSAF_BODY_SLICE_BYTES,
        CSAF_BODY_SLICE_BYTES,
        5,
      ]);
    });

    it('gives the event loop a turn between slices of a corpus larger than one slice', async () => {
      const doc = (i: number) => `{"id":"d${i}","pad":"${'a'.repeat(300 * 1024)}"}`;
      const corpus = Buffer.from(`[${Array.from({ length: 10 }, (_, i) => doc(i)).join(',')}]`);
      const sliceCount = Math.ceil(corpus.byteLength / CSAF_BODY_SLICE_BYTES);
      expect(sliceCount).toBeGreaterThan(1);
      const turns = jest.spyOn(global, 'setImmediate');
      try {
        const docs = await collectDocs(corpus);
        // Documents span slice boundaries and all still come out whole.
        expect(docs).toHaveLength(10);
        expect(turns.mock.calls.length).toBeGreaterThanOrEqual(sliceCount);
      } finally {
        turns.mockRestore();
      }
    });

    it('parses a multibyte character split across a slice boundary', async () => {
      const prefix = '[{"id":"x","name":"';
      // Pad so the two-byte "ż" starts on the last byte of the first slice.
      const pad = 'a'.repeat(CSAF_BODY_SLICE_BYTES - Buffer.byteLength(prefix) - 1);
      const corpus = Buffer.from(`${prefix}${pad}żółć"}]`);
      expect(corpus[CSAF_BODY_SLICE_BYTES - 1]).toBe(0xc5);
      const docs = (await collectDocs(corpus)) as Array<{ name: string }>;
      expect(docs).toHaveLength(1);
      expect(docs[0].name.endsWith('żółć')).toBe(true);
    });
  });

  it('parses a cached corpus body through parseFeedBody', async () => {
    const feed = await parseFeedBody(
      rhel10,
      Buffer.concat([Buffer.from('['), csafFixture, Buffer.from(']')])
    );
    expect(feed.definitions).toBe(1);
    expect(feed.records).toHaveLength(3);
  });
});
