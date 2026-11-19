/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { timeoutSignal } from '@kbn/std';

export const KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

/** The catalog is about 1.8 MB today; the cap leaves headroom and still bounds memory. */
export const MAX_KEV_BYTES = 16 * 1024 * 1024;

/** How long a parsed catalog is reused before the next conditional request. */
export const KEV_TTL_MS = 24 * 60 * 60 * 1000;

/** Own deadline for the KEV download, so a hung CISA connection cannot stall a scan. */
export const KEV_FETCH_TIMEOUT_MS = 60_000;

export interface KevEntry {
  dateAdded: string;
  dueDate: string;
  knownRansomwareCampaignUse: 'Known' | 'Unknown';
}

export type KevEntries = ReadonlyMap<string, KevEntry>;

export type DownloadKevResult =
  | { status: 'ok'; entries: KevEntries; lastModified?: string }
  | { status: 'not_modified'; lastModified?: string }
  /** Network failure, HTTP error, oversize or malformed body; enrichment is skipped. */
  | { status: 'unavailable'; reason: string };

export type LoadKevResult =
  | { status: 'ok'; entries: KevEntries }
  /** The download failed after the TTL expired; these are the last known entries. */
  | { status: 'stale'; entries: KevEntries; reason: string }
  | { status: 'unavailable'; reason: string };

export interface DownloadKevOptions {
  fetchImpl?: typeof fetch;
  logger?: Pick<Logger, 'warn'>;
  timeoutMs?: number;
}

interface RawKevVulnerability {
  cveID?: string;
  dateAdded?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
}

interface RawKevCatalog {
  count?: number;
  vulnerabilities?: RawKevVulnerability[];
}

const tooLarge = (bytes: number): Error =>
  new Error(`KEV catalog is over ${MAX_KEV_BYTES} bytes (${bytes} read or declared)`);

/** Reads the body, refusing anything over {@link MAX_KEV_BYTES} even without a content-length. */
const readCapped = async (response: Response): Promise<Buffer> => {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_KEV_BYTES) {
    await response.body?.cancel();
    throw tooLarge(declared);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_KEV_BYTES) {
      await reader.cancel();
      throw tooLarge(total);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, total);
};

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD (`2026-02-30` is rejected). */
const isIsoDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

/** Returns the entries keyed by CVE id, or a reason string when the catalog is malformed. */
const parseCatalog = (body: Buffer): KevEntries | string => {
  let catalog: RawKevCatalog;
  try {
    catalog = JSON.parse(body.toString('utf8')) as RawKevCatalog;
  } catch (error) {
    return `KEV catalog is not valid JSON: ${error instanceof Error ? error.message : error}`;
  }
  const { count, vulnerabilities } = catalog ?? {};
  if (!Array.isArray(vulnerabilities)) return 'KEV catalog has no vulnerabilities array';
  if (count !== vulnerabilities.length) {
    return `KEV catalog count ${count} does not match its ${vulnerabilities.length} entries`;
  }
  const entries = new Map<string, KevEntry>();
  for (const { cveID, dateAdded, dueDate, knownRansomwareCampaignUse } of vulnerabilities) {
    if (!isNonEmptyString(cveID) || !isNonEmptyString(dateAdded) || !isNonEmptyString(dueDate)) {
      return 'KEV catalog has an entry without cveID, dateAdded or dueDate';
    }
    if (!isIsoDate(dateAdded) || !isIsoDate(dueDate)) {
      return `KEV catalog entry ${cveID} has a dateAdded or dueDate that is not a YYYY-MM-DD date`;
    }
    entries.set(cveID, {
      dateAdded,
      dueDate,
      knownRansomwareCampaignUse: knownRansomwareCampaignUse === 'Known' ? 'Known' : 'Unknown',
    });
  }
  return entries;
};

/**
 * Downloads the CISA KEV catalog. Never throws: enrichment is optional, so a network, HTTP,
 * size or format problem comes back as `unavailable` and the scan carries on unenriched.
 */
export const downloadKevCatalog = async (
  signal?: AbortSignal,
  lastModified?: string,
  { fetchImpl = fetch, logger, timeoutMs = KEV_FETCH_TIMEOUT_MS }: DownloadKevOptions = {}
): Promise<DownloadKevResult> => {
  const timeout = timeoutSignal(timeoutMs);
  try {
    const response = await fetchImpl(KEV_URL, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: lastModified ? { 'if-modified-since': lastModified } : undefined,
    });
    if (response.status === 304) {
      await response.body?.cancel();
      return {
        status: 'not_modified',
        lastModified: response.headers.get('last-modified') ?? lastModified,
      };
    }
    if (!response.ok) {
      await response.body?.cancel();
      return { status: 'unavailable', reason: `KEV catalog returned HTTP ${response.status}` };
    }
    const parsed = parseCatalog(await readCapped(response));
    if (typeof parsed === 'string') {
      logger?.warn(`Skipping KEV enrichment: ${parsed}`);
      return { status: 'unavailable', reason: parsed };
    }
    return {
      status: 'ok',
      entries: parsed,
      lastModified: response.headers.get('last-modified') ?? undefined,
    };
  } catch (error) {
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    timeout.dispose();
  }
};

interface CachedKev {
  entries: KevEntries;
  lastModified?: string;
  fetchedAt: number;
}

// Per process, one entry: the catalog is global, not per OS release.
let cache: CachedKev | undefined;

export const getCachedKev = (nowMs: number = Date.now()): CachedKev | undefined =>
  cache && nowMs - cache.fetchedAt < KEV_TTL_MS ? cache : undefined;

export const setCachedKev = (entry: CachedKev): void => {
  cache = entry;
};

export const clearKevCache = (): void => {
  cache = undefined;
};

export interface LoadKevOptions extends DownloadKevOptions {
  now?: () => number;
}

/**
 * The catalog for one scan: the cached copy while it is under 24 h old, otherwise a conditional
 * download that revalidates a stale copy with `If-Modified-Since`. When that download fails and
 * an expired copy exists, the expired entries come back with `status: 'stale'`.
 */
export const loadKev = async (
  signal?: AbortSignal,
  { now = Date.now, ...options }: LoadKevOptions = {}
): Promise<LoadKevResult> => {
  const nowMs = now();
  const fresh = getCachedKev(nowMs);
  if (fresh) return { status: 'ok', entries: fresh.entries };

  const stale = cache;
  const result = await downloadKevCatalog(signal, stale?.lastModified, options);
  if (result.status === 'unavailable') {
    // An outage must not erase what is already known: serve the expired copy, marked stale.
    return stale ? { status: 'stale', entries: stale.entries, reason: result.reason } : result;
  }
  if (result.status === 'ok') {
    setCachedKev({ entries: result.entries, lastModified: result.lastModified, fetchedAt: nowMs });
    return { status: 'ok', entries: result.entries };
  }
  // A 304 is only sent to a conditional request, which needs a cached copy to revalidate.
  if (!stale) return { status: 'unavailable', reason: 'KEV catalog answered 304 without a cache' };
  setCachedKev({ ...stale, lastModified: result.lastModified, fetchedAt: nowMs });
  return { status: 'ok', entries: stale.entries };
};
