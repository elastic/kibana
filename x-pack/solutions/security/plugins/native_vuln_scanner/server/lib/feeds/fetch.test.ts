/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { feedUrl, loadFeed, MAX_FEED_BYTES } from './fetch';

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
    expect(fetchImpl).toHaveBeenCalledWith(feedUrl(rhel9), { signal });
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
      url: 'https://security.access.redhat.com/data/oval/v2/RHEL10/rhel-10.oval.xml.bz2',
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

  it('refuses a feed that decompresses past the decompressed cap', async () => {
    const fetchImpl = respond(rhelBz2);
    await expect(loadFeed(rhel9, { fetchImpl, maxDecompressedBytes: 8 })).rejects.toThrow(
      'decompresses past 8 bytes'
    );
  });

  it('stops decompressing when the signal aborts mid-parse', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn(async () => {
      // Abort after the download, before the parse consumes any block.
      controller.abort();
      return fakeResponse(rhelBz2);
    }) as unknown as typeof fetch;
    await expect(
      loadFeed(rhel9, { signal: controller.signal, fetchImpl })
    ).rejects.toThrow();
  });
});
