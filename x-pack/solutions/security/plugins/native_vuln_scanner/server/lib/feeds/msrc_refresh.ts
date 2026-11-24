/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countInto } from './oval';
import { downloadMsrcCvrf, downloadMsrcUpdatesIndex, type DownloadMsrcOptions } from './fetch';
import {
  parseMsrcCvrf,
  parseMsrcUpdatesIndex,
  type MsrcAdvisoryRow,
  type MsrcCve,
  type MsrcUpdatesIndexEntry,
} from './msrc_cvrf';

/*
 * Keeps the reduced rows of the last N monthly MSRC documents between scans. Each scan reads
 * the small `updates` index and refetches only a month whose `CurrentReleaseDate` changed: MSRC
 * re-stamps old months, and the documents carry no ETag, so the index is the only cheap signal.
 *
 * The months live in module-level stores of their own, one per feed mirror, not in `feed_cache`,
 * so twelve months cannot evict the eight Ubuntu/RHEL entries that cache holds and a month
 * fetched from one mirror is never served for another.
 */

/** Months kept by default. A host older than this window is counted as `windows_build_older_than_window` in the scan's notes. */
export const MSRC_WINDOW_MONTHS = 12;

/** The most months a caller may ask for. */
export const MSRC_MAX_WINDOW_MONTHS = 24;

export interface MsrcMonthSlice {
  /** A month token, `2026-Nov`. */
  id: string;
  /** The updates index's `CurrentReleaseDate` this slice was fetched at. */
  currentReleaseDate?: string;
  rows: MsrcAdvisoryRow[];
  cves: MsrcCve[];
}

export interface MsrcRefreshOptions extends DownloadMsrcOptions {
  /** Months to keep, 1 to {@link MSRC_MAX_WINDOW_MONTHS}; defaults to {@link MSRC_WINDOW_MONTHS}. */
  windowMonths?: number;
}

export interface MsrcRefreshResult {
  /** The window's months, newest first, that have rows (a failed month never fetched has none). */
  slices: MsrcMonthSlice[];
  /** The months the index puts in the window, newest first. */
  window: string[];
  /** The months fetched by this call. */
  refreshed: string[];
  /** One entry per month that could not be refreshed. */
  warnings: string[];
  /** What the parser dropped in the months fetched by this call, by reason. */
  skipped: Record<string, number>;
}

interface FetchedMonth {
  slice: MsrcMonthSlice;
  /** What the parser dropped in this fetch, by reason. */
  skipped: Record<string, number>;
}

/** Stored months by mirror base URL (`''` for the public feed), then month token. */
const stores = new Map<string, Map<string, MsrcMonthSlice>>();

/** Months being fetched right now, by `${mirrorKey}|${month}`; concurrent callers await one fetch. */
const inFlight = new Map<string, Promise<FetchedMonth>>();

/** The mirror as `resolveFeedUrl` reads it: a trailing slash does not name another mirror. */
const mirrorKey = (feedMirrorUrl: string | undefined): string =>
  (feedMirrorUrl ?? '').replace(/\/+$/, '');

const storeFor = (feedMirrorUrl: string | undefined): Map<string, MsrcMonthSlice> => {
  const key = mirrorKey(feedMirrorUrl);
  let store = stores.get(key);
  if (!store) {
    store = new Map();
    stores.set(key, store);
  }
  return store;
};

/** Forgets every stored month; for tests. */
export const clearMsrcStore = (): void => {
  stores.clear();
  inFlight.clear();
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-Nov` as a sortable number; the index parser has already validated the token. */
const monthOrder = (id: string): number =>
  Number(id.slice(0, 4)) * 12 + MONTHS.indexOf(id.slice(5, 8));

const failureText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const downloadMonth = async (
  { id, currentReleaseDate }: MsrcUpdatesIndexEntry,
  options: MsrcRefreshOptions
): Promise<FetchedMonth> => {
  const download = await downloadMsrcCvrf(id, options);
  if (download.status === 'unavailable') throw new Error(`MSRC has no document at ${download.url}`);
  try {
    const parsed = await parseMsrcCvrf(download.chunks, { signal: options.signal });
    if (parsed.documentId !== id) {
      throw new Error(`MSRC document is ${parsed.documentId}, not the requested ${id}`);
    }
    return {
      slice: { id, currentReleaseDate, rows: parsed.rows, cves: parsed.cves },
      skipped: parsed.skipped,
    };
  } finally {
    await download.cancel();
  }
};

/**
 * Fetches one month, sharing the download with any concurrent call for the same mirror and month
 * and with the same `CurrentReleaseDate`, so two scans starting together do not pull and parse a
 * multi-megabyte document twice. The entry is dropped as soon as the fetch settles, so a failure
 * is retried by the next call and a finished fetch is served from the store, not from here.
 */
const fetchMonth = (
  entry: MsrcUpdatesIndexEntry,
  options: MsrcRefreshOptions
): Promise<FetchedMonth> => {
  const key = `${mirrorKey(options.feedMirrorUrl)}|${entry.id}|${entry.currentReleaseDate ?? ''}`;
  const running = inFlight.get(key);
  if (running) return running;
  const started = downloadMonth(entry, options).finally(() => {
    if (inFlight.get(key) === started) inFlight.delete(key);
  });
  inFlight.set(key, started);
  return started;
};

/**
 * Brings the stored months up to date and returns the window's slices.
 *
 * A month that fails to refresh keeps its previous rows and adds a warning naming it. The newest
 * month is the one that changes during the month, so when it has never been fetched there is
 * nothing to keep and the call throws; so does a failure of the index itself.
 */
export const refreshMsrcFeed = async (options: MsrcRefreshOptions): Promise<MsrcRefreshResult> => {
  const { windowMonths = MSRC_WINDOW_MONTHS, signal } = options;
  if (
    !Number.isInteger(windowMonths) ||
    windowMonths < 1 ||
    windowMonths > MSRC_MAX_WINDOW_MONTHS
  ) {
    throw new RangeError(`MSRC window must be 1 to ${MSRC_MAX_WINDOW_MONTHS} months`);
  }
  const index = await downloadMsrcUpdatesIndex(options);
  if (index.status === 'unavailable')
    throw new Error(`MSRC updates index not found at ${index.url}`);
  const entries = new Map<string, MsrcUpdatesIndexEntry>();
  for (const entry of parseMsrcUpdatesIndex(index.body).months) entries.set(entry.id, entry);
  const inWindow = [...entries.values()]
    .sort((a, b) => monthOrder(b.id) - monthOrder(a.id))
    .slice(0, windowMonths);
  if (inWindow.length === 0) throw new Error('MSRC updates index lists no monthly documents');

  const store = storeFor(options.feedMirrorUrl);
  const [current] = inWindow;
  const refreshed: string[] = [];
  const warnings: string[] = [];
  const skipped: Record<string, number> = {};
  for (const entry of inWindow) {
    const stored = store.get(entry.id);
    // An index entry without a date cannot prove the stored month is current.
    if (
      stored &&
      entry.currentReleaseDate !== undefined &&
      stored.currentReleaseDate === entry.currentReleaseDate
    ) {
      continue;
    }
    try {
      const fetched = await fetchMonth(entry, options);
      for (const [reason, count] of Object.entries(fetched.skipped)) {
        countInto(skipped, reason, count);
      }
      store.set(entry.id, fetched.slice);
      refreshed.push(entry.id);
    } catch (error) {
      if (signal?.aborted) throw error;
      if (entry === current && !stored) {
        throw new Error(
          `MSRC ${entry.id} (the current month) could not be fetched: ${failureText(error)}`
        );
      }
      warnings.push(
        `MSRC ${entry.id} could not be refreshed (${failureText(error)}); ${
          stored ? 'kept the rows from the previous fetch' : 'no rows for this month'
        }`
      );
    }
  }

  const window = inWindow.map(({ id }) => id);
  // Prune against the widest window a caller may ask for, so a caller with a short window does
  // not delete the months another caller with a longer one still relies on.
  const kept = new Set(
    [...entries.keys()]
      .sort((a, b) => monthOrder(b) - monthOrder(a))
      .slice(0, MSRC_MAX_WINDOW_MONTHS)
  );
  for (const id of store.keys()) if (!kept.has(id)) store.delete(id);
  const slices = window.flatMap((id) => store.get(id) ?? []);
  return { slices, window, refreshed, warnings, skipped };
};
