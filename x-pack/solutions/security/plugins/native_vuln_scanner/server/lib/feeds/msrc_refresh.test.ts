/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as fetchModule from './fetch';
import { clearMsrcStore, MSRC_MAX_WINDOW_MONTHS, refreshMsrcFeed } from './msrc_refresh';

const FIXTURES = join(__dirname, '__fixtures__', 'msrc');
const fixture = (name: string) => readFileSync(join(FIXTURES, name));

interface IndexEntry {
  ID: string;
  CurrentReleaseDate: string;
  [key: string]: unknown;
}
const baseIndex = JSON.parse(fixture('updates_trimmed.json').toString('utf8')) as {
  value: IndexEntry[];
};

const fakeResponse = (body: Uint8Array | string, status = 200) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(typeof body === 'string' ? Buffer.from(body) : body);
        controller.close();
      },
    }),
  } as unknown as Response);

/** A fake MSRC API: the index dates can be moved and single months made to fail. */
const msrcSite = () => {
  const dates = new Map(baseIndex.value.map((entry) => [entry.ID, entry.CurrentReleaseDate]));
  const failing = new Set<string>();
  const missing = new Set<string>();
  const requested: string[] = [];
  const fetchImpl = jest.fn(async (url: string) => {
    requested.push(url);
    if (url.endsWith('/cvrf/v3.0/updates')) {
      const value = baseIndex.value.map((entry) => ({
        ...entry,
        CurrentReleaseDate: dates.get(entry.ID),
      }));
      return fakeResponse(JSON.stringify({ value }));
    }
    const month = url.slice(url.lastIndexOf('/') + 1);
    if (failing.has(month)) return fakeResponse('boom', 500);
    if (missing.has(month)) return fakeResponse('', 404);
    return fakeResponse(fixture(`cvrf_${month}_trimmed.json`));
  });
  const months = () =>
    requested
      .filter((url) => url.includes('/cvrf/v3.0/cvrf/'))
      .map((u) => u.slice(u.lastIndexOf('/') + 1));
  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    months,
    reset: () => {
      requested.length = 0;
    },
    restamp: (month: string, date: string) => dates.set(month, date),
    failing,
    missing,
    requested,
  };
};

describe('refreshMsrcFeed', () => {
  beforeEach(() => clearMsrcStore());

  it('fetches every month of the window on the first call, newest first', async () => {
    const site = msrcSite();
    const result = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });

    expect(result.window).toEqual(['2026-Nov', '2026-Oct', '2026-Sep']);
    expect(result.slices.map(({ id }) => id)).toEqual(result.window);
    expect(result.refreshed.sort()).toEqual([...result.window].sort());
    expect(result.warnings).toEqual([]);
    expect(result.slices.every(({ rows }) => rows.length > 0)).toBe(true);
  });

  it('fetches only the index when no month changed', async () => {
    const site = msrcSite();
    const first = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });
    site.reset();

    const second = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });

    expect(site.requested).toHaveLength(1);
    expect(site.months()).toEqual([]);
    expect(second.refreshed).toEqual([]);
    expect(second.slices).toEqual(first.slices);
  });

  it('refetches only the month whose CurrentReleaseDate changed', async () => {
    const site = msrcSite();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 });
    site.reset();
    site.restamp('2026-Oct', '2026-11-24T09:00:00Z');

    const result = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });

    expect(site.months()).toEqual(['2026-Oct']);
    expect(result.refreshed).toEqual(['2026-Oct']);
    expect(result.slices.find(({ id }) => id === '2026-Oct')?.currentReleaseDate).toBe(
      '2026-11-24T09:00:00Z'
    );
  });

  it('keeps the old rows of a month that fails to refresh and warns naming it', async () => {
    const site = msrcSite();
    const first = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });
    site.restamp('2026-Sep', '2026-11-24T09:00:00Z');
    site.failing.add('2026-Sep');

    const result = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });

    expect(result.refreshed).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('2026-Sep');
    expect(result.slices.find(({ id }) => id === '2026-Sep')?.rows).toEqual(
      first.slices.find(({ id }) => id === '2026-Sep')?.rows
    );
    // The failure leaves the stored date alone, so the next scan tries the month again.
    site.reset();
    site.failing.clear();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 });
    expect(site.months()).toEqual(['2026-Sep']);
  });

  it('warns about an old month that was never fetched and is gone, and still returns the rest', async () => {
    const site = msrcSite();
    site.missing.add('2026-Aug');

    const result = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 5,
    });

    expect(result.window).toHaveLength(5);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('2026-Aug');
    expect(result.slices.map(({ id }) => id)).not.toContain('2026-Aug');
    expect(result.slices).toHaveLength(4);
  });

  it('fails when the current month has never been fetched', async () => {
    const site = msrcSite();
    site.failing.add('2026-Nov');

    await expect(
      refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 })
    ).rejects.toThrow(/2026-Nov/);
  });

  it('keeps serving the current month from the store when its refresh fails', async () => {
    const site = msrcSite();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 });
    site.restamp('2026-Nov', '2026-11-24T09:00:00Z');
    site.failing.add('2026-Nov');

    const result = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });

    expect(result.warnings[0]).toContain('2026-Nov');
    expect(result.slices).toHaveLength(3);
  });

  it('drops a stored month the index no longer lists', async () => {
    const site = msrcSite();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 });
    site.reset();

    const withoutSep = (async (url: string, init?: RequestInit) =>
      url.endsWith('/cvrf/v3.0/updates')
        ? fakeResponse(
            JSON.stringify({ value: baseIndex.value.filter(({ ID }) => ID !== '2026-Sep') })
          )
        : site.fetchImpl(url, init)) as unknown as typeof fetch;
    const result = await refreshMsrcFeed({
      fetchImpl: withoutSep,
      feedMirrorUrl: undefined,
      windowMonths: 2,
    });
    expect(result.window).toEqual(['2026-Nov', '2026-Oct']);
    expect(site.months()).toEqual([]);

    // Sep was forgotten, so it is fetched again once the index lists it.
    site.reset();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 });
    expect(site.months()).toEqual(['2026-Sep']);
  });

  it('rethrows an abort during a month fetch instead of warning', async () => {
    const site = msrcSite();
    const controller = new AbortController();
    const abortingFetch = jest.fn(async (url: string, init?: RequestInit) => {
      // An older month, so a swallowed abort would end as a warning rather than a failure.
      if (url.endsWith('/cvrf/v3.0/cvrf/2026-Oct')) {
        controller.abort(new DOMException('aborted', 'AbortError'));
      }
      return site.fetchImpl(url, init);
    });

    await expect(
      refreshMsrcFeed({
        fetchImpl: abortingFetch as unknown as typeof fetch,
        feedMirrorUrl: undefined,
        signal: controller.signal,
        windowMonths: 3,
      })
    ).rejects.toThrow(/abort/i);
  });

  it('does not delete months another caller’s longer window still needs', async () => {
    const site = msrcSite();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 3 });
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 1 });
    site.reset();

    const wide = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: undefined,
      windowMonths: 3,
    });

    expect(site.months()).toEqual([]);
    expect(wide.slices).toHaveLength(3);
  });

  it('keeps the months of one mirror apart from another’s', async () => {
    const site = msrcSite();
    const mirror = 'https://mirror.example.test/feeds';
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 2 });
    site.reset();

    const viaMirror = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: mirror,
      windowMonths: 2,
    });

    expect(viaMirror.refreshed.sort()).toEqual(['2026-Nov', '2026-Oct']);
    expect(site.months()).toHaveLength(2);
    site.reset();
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: mirror, windowMonths: 2 });
    expect(site.months()).toEqual([]);
  });

  it('shares one fetch between concurrent refreshes of the same mirror and month', async () => {
    const site = msrcSite();
    const options = { fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 2 };

    const [first, second] = await Promise.all([refreshMsrcFeed(options), refreshMsrcFeed(options)]);

    expect(site.months().sort()).toEqual(['2026-Nov', '2026-Oct']);
    expect(first.slices.map(({ id }) => id)).toEqual(second.slices.map(({ id }) => id));
    expect(first.slices).toHaveLength(2);
    expect(second.slices).toHaveLength(2);
    // Each caller is told what its own refresh brought in.
    expect(first.refreshed.sort()).toEqual(['2026-Nov', '2026-Oct']);
    expect(second.refreshed.sort()).toEqual(['2026-Nov', '2026-Oct']);
  });

  it('fetches again with its own signal when the shared fetch failed because another caller aborted', async () => {
    const site = msrcSite();
    const aborted = new AbortController();
    const gate = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/cvrf/v3.0/updates')) return site.fetchImpl(url, init);
      // The first caller's request is the one that is in flight when it aborts.
      if (aborted.signal.aborted) return site.fetchImpl(url, init);
      queueMicrotask(() => aborted.abort(new DOMException('aborted', 'AbortError')));
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      });
    });
    const options = { feedMirrorUrl: undefined, windowMonths: 1 };

    const [first, second] = await Promise.allSettled([
      refreshMsrcFeed({
        ...options,
        fetchImpl: gate as unknown as typeof fetch,
        signal: aborted.signal,
      }),
      refreshMsrcFeed({ ...options, fetchImpl: gate as unknown as typeof fetch }),
    ]);

    expect(first.status).toBe('rejected');
    expect(second.status).toBe('fulfilled');
    expect((second as PromiseFulfilledResult<{ slices: unknown[] }>).value.slices).toHaveLength(1);
  });

  it('does not share a fetch across mirrors, or once a month was re-stamped', async () => {
    const site = msrcSite();
    await Promise.all([
      refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 1 }),
      refreshMsrcFeed({
        fetchImpl: site.fetchImpl,
        feedMirrorUrl: 'https://mirror.example.test/feeds',
        windowMonths: 1,
      }),
    ]);
    expect(site.months()).toHaveLength(2);

    site.restamp('2026-Nov', '2026-12-01T08:00:00Z');
    await refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 1 });
    expect(site.months()).toHaveLength(3);
  });

  it('retries a month the next call after a shared fetch failed', async () => {
    const site = msrcSite();
    const options = { fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: 1 };
    site.failing.add('2026-Nov');

    const settled = await Promise.allSettled([refreshMsrcFeed(options), refreshMsrcFeed(options)]);

    expect(settled.map(({ status }) => status)).toEqual(['rejected', 'rejected']);
    expect(site.months()).toHaveLength(1);

    site.failing.clear();
    await expect(refreshMsrcFeed(options)).resolves.toEqual(
      expect.objectContaining({ refreshed: ['2026-Nov'] })
    );
  });

  it('treats a trailing slash on the mirror as the same mirror', async () => {
    const site = msrcSite();
    await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: 'https://m.example.test/',
      windowMonths: 2,
    });
    site.reset();

    const bare = await refreshMsrcFeed({
      fetchImpl: site.fetchImpl,
      feedMirrorUrl: 'https://m.example.test',
      windowMonths: 2,
    });

    expect(site.months()).toEqual([]);
    expect(bare.refreshed).toEqual([]);
    expect(bare.slices).toHaveLength(2);
  });

  it('ends every download, including a document that is not the one requested', async () => {
    const realDownload = fetchModule.downloadMsrcCvrf;
    const cancels = jest.fn();
    const spy = jest.spyOn(fetchModule, 'downloadMsrcCvrf').mockImplementation(async (...args) => {
      const download = await realDownload(...args);
      if (download.status !== 'ok') return download;
      return {
        ...download,
        cancel: async () => {
          cancels();
          await download.cancel();
        },
      };
    });
    try {
      const site = msrcSite();
      await refreshMsrcFeed({
        fetchImpl: site.fetchImpl,
        feedMirrorUrl: undefined,
        windowMonths: 3,
      });
      expect(cancels).toHaveBeenCalledTimes(3);

      clearMsrcStore();
      cancels.mockClear();
      const wrong = jest.fn(async (url: string) =>
        url.endsWith('/updates')
          ? fakeResponse(JSON.stringify({ value: baseIndex.value }))
          : fakeResponse(fixture('cvrf_2026-Jul_trimmed.json'))
      );
      await expect(
        refreshMsrcFeed({
          fetchImpl: wrong as unknown as typeof fetch,
          feedMirrorUrl: undefined,
          windowMonths: 1,
        })
      ).rejects.toThrow(/not the requested/);
      expect(cancels).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it.each([0, 1.5, MSRC_MAX_WINDOW_MONTHS + 1])('rejects a window of %s months', async (months) => {
    const site = msrcSite();
    await expect(
      refreshMsrcFeed({ fetchImpl: site.fetchImpl, feedMirrorUrl: undefined, windowMonths: months })
    ).rejects.toThrow(RangeError);
    expect(site.requested).toEqual([]);
  });
});
