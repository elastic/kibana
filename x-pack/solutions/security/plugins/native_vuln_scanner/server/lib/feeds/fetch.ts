/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { Readable } from 'stream';
import { createZstdDecompress } from 'zlib';
import { bunzip2Blocks } from './bzip2';
import { MAX_DOCUMENT_BYTES } from './json';
import { parseRhelCsaf } from './rhel_csaf';
import { readTarEntries } from './tar';
import type { FeedParseResult } from './types';
import { parseUbuntuOval } from './ubuntu_oval';
import { parseRhelOval } from './rhel_oval';

export type FeedOs = FeedParseResult['os'];

/** The largest compressed feed we accept; the biggest today (Ubuntu noble) is about 12 MB. */
export const MAX_FEED_BYTES = 64 * 1024 * 1024;

/** Decompressed output cap; the download cap alone does not bound it. */
export const MAX_DECOMPRESSED_FEED_BYTES = 512 * 1024 * 1024;

/** The unpatched RHEL feed decompresses to about 658 MB; it gets a larger cap. */
export const MAX_DECOMPRESSED_UNPATCHED_FEED_BYTES = 768 * 1024 * 1024;

/** RHEL major from which Red Hat publishes CSAF only (no OVAL exists for these). */
export const RHEL_CSAF_MIN_MAJOR = 10;

const UBUNTU_CODENAME = /^[a-z]+$/;
const RHEL_MAJOR = /^[1-9]\d*$/;

const REDHAT_CSAF_BASE_URL = 'https://security.access.redhat.com/data/csaf/v2/advisories/';

/**
 * Names the current bulk archive ('csaf_advisories_YYYY-MM-DD.tar.zst', one download instead of
 * thousands); verified 2026-11-19, see README (CSAF feed shape). This is the feed URL of a
 * CSAF-only RHEL major.
 */
export const REDHAT_CSAF_ARCHIVE_LATEST_URL = `${REDHAT_CSAF_BASE_URL}archive_latest.txt`;

/** Every advisory changed since, newest first: "2026/rhsa-2026_22111.json","<ISO time>". */
export const REDHAT_CSAF_CHANGES_URL = `${REDHAT_CSAF_BASE_URL}changes.csv`;

/**
 * RHEL majors below {@link RHEL_CSAF_MIN_MAJOR} have no CSAF coverage at all (they stay on
 * OVAL), and no advisory older than this first CSAF year can mention a later major, so
 * archive entries and delta paths are filtered to these years.
 */
export const REDHAT_CSAF_FIRST_YEAR = 2024;

/** '2026/rhsa-2026_22111.json', optionally './'-prefixed as tar writers often do. */
const CSAF_PATH = /^(?:\.\/)?(\d{4})\/[A-Za-z0-9_-]+\.json$/;

const CSAF_ARCHIVE_NAME = /^[A-Za-z0-9._-]+\.tar\.zst$/;
const CSAF_ARCHIVE_NAME_DATE = /(\d{4}-\d{2}-\d{2})/;

/** A 'changes.csv' row; the quotes are optional. */
const CHANGES_ROW = /^"?([^",]+)"?,"?([^",]+)"?$/;

/** The largest 'changes.csv' we accept; it is under 2 MB today. */
export const MAX_CSAF_CHANGES_BYTES = 16 * 1024 * 1024;

/** The largest 'archive_latest.txt' we accept; it holds one file name. */
const MAX_CSAF_ARCHIVE_NAME_BYTES = 4096;

/**
 * Cap on the kept (substring-filtered) corpus of one RHEL major, uncompressed JSON. Today
 * RHEL 10 keeps about 244 MB of the archive's 8 GB.
 */
export const MAX_CSAF_CORPUS_BYTES = 768 * 1024 * 1024;

/**
 * The most advisories downloaded individually on top of the archive. The archive is
 * regenerated about weekly, so the delta is normally hundreds; over this, the archive is
 * used alone (and a warning logged) rather than failing the scan.
 */
export const MAX_CSAF_DELTA_ADVISORIES = 1500;

/** How many CSAF delta advisory documents are downloaded at once. */
export const CSAF_FETCH_CONCURRENCY = 6;

/** Streaming the 126 MB archive and filtering 8 GB out of it takes minutes. */
export const CSAF_ARCHIVE_TIMEOUT_MS = 10 * 60 * 1000;

/** 'archive_latest.txt', the archive HEAD, 'changes.csv' and each delta advisory. */
export const CSAF_REQUEST_TIMEOUT_MS = 60 * 1000;

/** One predicate for download and parse: a RHEL release whose advisories ship as CSAF. */
const isCsafRelease = (os: FeedOs): boolean =>
  os.family === 'rhel' && RHEL_MAJOR.test(os.version) && Number(os.version) >= RHEL_CSAF_MIN_MAJOR;

/** A non-CSAF OVAL feed is at most {@link MAX_FEED_BYTES}; headers and body share one deadline. */
export const FEED_DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export interface FeedUrlOptions {
  /** RHEL: use the feed that also carries unpatched (unfixed CVE) definitions. */
  includeUnfixed?: boolean;
}

/**
 * Vendor OVAL feed for one OS release. The release comes from host-reported data, so it is
 * validated before it becomes part of a URL. RHEL majors on CSAF have no OVAL feed; the
 * CSAF source URL names the bulk archive ({@link REDHAT_CSAF_ARCHIVE_LATEST_URL}), not a
 * per-release file.
 */
export const feedUrl = (
  { family, version }: FeedOs,
  { includeUnfixed }: FeedUrlOptions = {}
): string => {
  if (family === 'ubuntu' && UBUNTU_CODENAME.test(version)) {
    return `https://security-metadata.canonical.com/oval/com.ubuntu.${version}.cve.oval.xml.bz2`;
  }
  if (isCsafRelease({ family, version })) return REDHAT_CSAF_ARCHIVE_LATEST_URL;
  if (family === 'rhel' && RHEL_MAJOR.test(version)) {
    return includeUnfixed
      ? `https://security.access.redhat.com/data/oval/v2/RHEL${version}/rhel-${version}-including-unpatched.oval.xml.bz2`
      : `https://security.access.redhat.com/data/oval/v2/RHEL${version}/rhel-${version}.oval.xml.bz2`;
  }
  throw new Error(`No advisory feed for ${family} ${version}`);
};

export interface FeedHeaders {
  /** Validators the vendor sent with the feed; reported in the run summary. */
  etag?: string;
  lastModified?: string;
}

export type DownloadFeedResult =
  | ({ status: 'ok'; body: Uint8Array } & FeedHeaders & DownloadFeedTiming)
  /** The vendor answered 304 to the `etag` the caller sent. */
  | ({ status: 'not_modified' } & FeedHeaders & DownloadFeedTiming)
  /** The vendor publishes no feed for this release (HTTP 404), e.g. an EOL codename. */
  | ({ status: 'unavailable'; url: string } & DownloadFeedTiming);

export type LoadFeedResult =
  | ({
      status: 'ok';
      feed: FeedParseResult;
      /** Set on a 304: the knowledge ids already written cleanly for these exact feed bytes. */
      knowledgeStoredIds?: ReadonlySet<string>;
      /** sha256 of the feed body bytes, hex; the checkpoint's feed fingerprint. */
      bodySha256?: string;
    } & FeedHeaders)
  /** The vendor publishes no feed for this release (HTTP 404), e.g. an EOL codename. */
  | { status: 'unavailable'; url: string };

export interface DownloadFeedOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Sent as `If-None-Match`, so an unchanged feed costs no body. */
  etag?: string;
  /** RHEL: fetch the feed that also carries unpatched (unfixed CVE) definitions. */
  includeUnfixed?: boolean;
  /** Receives CSAF degradations that do not fail the download (delta over cap, skipped docs). */
  logger?: { warn: (message: string) => void };
  /** Server-clock skew folded out of the reported duration; for tests. */
  clock?: () => number;
}

export interface DownloadFeedTiming {
  /** Wall-clock milliseconds the download took (headers plus body), rounded up to whole ms. */
  durationMs: number;
  /** Body bytes transferred: the compressed feed, or the summed kept-corpus size for CSAF. */
  downloadedBytes: number;
}

export interface LoadFeedOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Overrides the decompressed-bytes cap; for tests. */
  maxDecompressedBytes?: number;
  /** RHEL: parse the feed that also carries unpatched (unfixed CVE) definitions. */
  includeUnfixed?: boolean;
}

const tooLarge = (url: string, bytes: number): Error =>
  new Error(`Advisory feed ${url} is over ${MAX_FEED_BYTES} bytes (${bytes} read or declared)`);

/**
 * Reads the body, refusing anything over {@link MAX_FEED_BYTES} even without a content-length.
 * Reads are raced against `signal` so a stalled body rejects and the reader is cancelled.
 */
const readCapped = async (
  response: Response,
  url: string,
  signal?: AbortSignal
): Promise<Uint8Array> => {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_FEED_BYTES) {
    await response.body?.cancel();
    throw tooLarge(url, declared);
  }
  if (!response.body) return Buffer.alloc(0);
  signal?.throwIfAborted();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await raceAbort(reader.read(), signal);
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FEED_BYTES) throw tooLarge(url, total);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  return Buffer.concat(chunks, total);
};

/** Caps total decompressed bytes and honours abort between blocks. */
const guardBlocks = function* (
  blocks: Generator<Buffer>,
  url: string,
  signal: AbortSignal | undefined,
  maxDecompressedBytes: number
): Generator<Buffer> {
  let total = 0;
  for (const block of blocks) {
    signal?.throwIfAborted();
    total += block.byteLength;
    if (total > maxDecompressedBytes) {
      throw new Error(`Advisory feed ${url} decompresses past ${maxDecompressedBytes} bytes`);
    }
    yield block;
  }
};

/** Downloads the compressed advisory feed for one OS release without parsing it. */
export const downloadFeed = async (
  os: FeedOs,
  {
    signal,
    fetchImpl = fetch,
    etag: knownEtag,
    includeUnfixed,
    logger,
    clock = () => Date.now(),
  }: DownloadFeedOptions = {}
): Promise<DownloadFeedResult> => {
  if (isCsafRelease(os)) {
    return downloadCsafCorpus(os.version, knownEtag, signal, fetchImpl, logger, clock);
  }
  const startedAt = clock();
  const timing = (): DownloadFeedTiming => ({
    durationMs: Math.max(1, Math.round(clock() - startedAt)),
    downloadedBytes: 0,
  });
  const url = feedUrl(os, { includeUnfixed });
  // Fetch and body read share one deadline and the caller's signal: a body that stalls after
  // the headers must fail the download instead of hanging it.
  return withTimeout(signal, FEED_DOWNLOAD_TIMEOUT_MS, async (requestSignal) => {
    const response = await fetchImpl(url, {
      signal: requestSignal,
      headers: knownEtag ? { 'if-none-match': knownEtag } : undefined,
    });
    if (response.status === 304) {
      await response.body?.cancel();
      return {
        status: 'not_modified',
        etag: response.headers.get('etag') ?? knownEtag,
        lastModified: response.headers.get('last-modified') ?? undefined,
        ...timing(),
      };
    }
    if (response.status === 404) {
      await response.body?.cancel();
      return { status: 'unavailable', url, ...timing() };
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Advisory feed ${url} returned HTTP ${response.status}`);
    }
    const body = await readCapped(response, url, requestSignal);
    const etag = response.headers.get('etag') ?? undefined;
    const lastModified = response.headers.get('last-modified') ?? undefined;
    return {
      status: 'ok',
      body,
      etag,
      lastModified,
      ...timing(),
      downloadedBytes: body.byteLength,
    };
  });
};

/** Decompresses and parses a feed body from {@link downloadFeed}. */
export const parseFeedBody = async (
  os: FeedOs,
  body: Uint8Array,
  {
    signal,
    maxDecompressedBytes,
    includeUnfixed,
  }: Pick<LoadFeedOptions, 'signal' | 'maxDecompressedBytes' | 'includeUnfixed'> = {}
): Promise<FeedParseResult> => {
  if (isCsafRelease(os)) {
    // The cached "body" of a CSAF release is the JSON-array corpus that downloadCsafCorpus
    // produced from the index; re-parsed here like any other feed body.
    return parseRhelCsaf(bodyToLineIterable(body), { major: os.version });
  }
  const blocks = guardBlocks(
    bunzip2Blocks(body),
    feedUrl(os, { includeUnfixed }),
    signal,
    maxDecompressedBytes ??
      (os.family === 'rhel' && includeUnfixed
        ? MAX_DECOMPRESSED_UNPATCHED_FEED_BYTES
        : MAX_DECOMPRESSED_FEED_BYTES)
  );
  return os.family === 'ubuntu'
    ? parseUbuntuOval(blocks, { release: os.version, includeUnfixed })
    : parseRhelOval(blocks, { major: os.version, includeUnfixed });
};

/**
 * Downloads, decompresses and parses the advisory feed for one OS release. RHEL majors
 * on CSAF stream the bulk archive, keep the advisories that mention the major and parse
 * them as one logical feed.
 */
export const loadFeed = async (
  os: FeedOs,
  { signal, fetchImpl, maxDecompressedBytes, includeUnfixed }: LoadFeedOptions = {}
): Promise<LoadFeedResult> => {
  const downloaded = await downloadFeed(os, { signal, fetchImpl, includeUnfixed });
  if (downloaded.status === 'unavailable') return downloaded;
  // No etag is sent here, so a 304 can only come from a misbehaving server.
  if (downloaded.status === 'not_modified') {
    throw new Error(
      `Advisory feed ${feedUrl(os, { includeUnfixed })} answered 304 to an unconditional request`
    );
  }
  const { body, etag, lastModified } = downloaded;
  const feed = await parseFeedBody(os, body, { signal, maxDecompressedBytes, includeUnfixed });
  return {
    status: 'ok',
    feed,
    etag,
    lastModified,
    bodySha256: createHash('sha256').update(body).digest('hex'),
  };
};

/**
 * Slice size for re-parsing a cached CSAF corpus. Small enough that the JSON splitter yields
 * to the event loop between slices and never decodes a ~hundreds-of-MB string in one go.
 */
export const CSAF_BODY_SLICE_BYTES = 1024 * 1024;

/** Yields a cached CSAF corpus in {@link CSAF_BODY_SLICE_BYTES} views (no copy, no whole-body string). */
export function* bodyToLineIterable(body: Uint8Array): Generator<Uint8Array> {
  for (let i = 0; i < body.byteLength; i += CSAF_BODY_SLICE_BYTES) {
    yield body.subarray(i, i + CSAF_BODY_SLICE_BYTES);
  }
}

/**
 * Runs `work` with the caller's signal plus a per-request deadline. The timer is cleared
 * when the work settles (the `AbortSignal.timeout` alternative keeps its abort listeners
 * alive until the deadline, and `timeoutSignal` needs a `using` prettier cannot parse).
 * Work that ignores the signal still rejects when the deadline fires.
 */
const withTimeout = async <T>(
  signal: AbortSignal | undefined,
  ms: number,
  work: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('The operation timed out', 'TimeoutError')),
    ms
  );
  // Do not keep the event loop alive for the deadline alone.
  timer.unref?.();
  const onCallerAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onCallerAbort, { once: true });
  const raced = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => reject(controller.signal.reason ?? new Error('The operation was aborted')),
      { once: true }
    );
  });
  try {
    return await Promise.race([work(controller.signal), raced]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
};

/**
 * Races `promise` against an abort signal, rejecting promptly when it fires; a stalled
 * body read must not outlive the deadline or the caller's cancellation.
 */
const raceAbort = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error('The operation was aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
};

/**
 * Reads a body, or returns `null` (cancelling the rest) when it is over `max`, declared or
 * read; the caller decides whether oversize is fatal. Reads are raced against `signal` so a
 * stalled body rejects instead of hanging.
 */
const readCappedTo = async (
  response: Response,
  max: number,
  signal?: AbortSignal
): Promise<Buffer | null> => {
  if (Number(response.headers.get('content-length')) > max) {
    await response.body?.cancel();
    return null;
  }
  if (!response.body) return Buffer.alloc(0);
  signal?.throwIfAborted();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await raceAbort(reader.read(), signal);
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  return Buffer.concat(chunks, total);
};

/** Adapts a fetch body to a Node stream without buffering it; destroy() cancels the body. */
const bodyToNodeStream = (response: Response, signal?: AbortSignal): Readable => {
  if (!response.body) return Readable.from([]);
  signal?.throwIfAborted();
  const reader = response.body.getReader();
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  return Readable.from(
    (async function* () {
      try {
        for (;;) {
          const { done, value } = await raceAbort(reader.read(), signal);
          if (done) return;
          yield value;
        }
      } finally {
        signal?.removeEventListener('abort', onAbort);
        await reader.cancel().catch(() => undefined);
      }
    })()
  );
};

const csafYear = (path: string): number | undefined => {
  const match = CSAF_PATH.exec(path);
  return match ? Number(match[1]) : undefined;
};

const sortedPathsHash = (paths: string[]): string =>
  createHash('sha256')
    .update([...paths].sort().join('\n'))
    .digest('hex')
    .slice(0, 16);

/** Fails the download on a non-OK status; 404 is the caller's business, checked first. */
const expectOk = async (response: Response, what: string): Promise<void> => {
  if (response.ok) return;
  await response.body?.cancel();
  throw new Error(`${what} returned HTTP ${response.status}`);
};

/**
 * Downloads the CSAF corpus of one RHEL major on CSAF: the bulk archive named by
 * `archive_latest.txt`, streamed through zstd and tar so its 8 GB of advisories are never
 * held, keeping advisories of {@link REDHAT_CSAF_FIRST_YEAR}+ whose bytes mention the major;
 * plus the advisories `changes.csv` lists after the archive was built. The kept documents
 * become one JSON-array body, the same shape `parseFeedBody` already reads.
 *
 * The cache identity (etag) is the archive name plus either a hash of the true delta
 * (paths changes.csv lists that the archive does not contain) or the `archive-only`
 * marker when that delta is over {@link MAX_CSAF_DELTA_ADVISORIES}; Red Hat republishes
 * in-archive advisories continuously, so the identity must not track that churn. An
 * unchanged delta is detected after the archive stream, before any per-advisory fetches.
 * `unavailable` is a 404 `archive_latest.txt`; archive errors throw.
 */
const downloadCsafCorpus = async (
  major: string,
  knownEtag: string | undefined,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
  logger: DownloadFeedOptions['logger'],
  clock: () => number = () => Date.now()
): Promise<DownloadFeedResult> => {
  const startedAt = clock();
  const timing = (downloadedBytes: number): DownloadFeedTiming => ({
    durationMs: Math.max(1, Math.round(clock() - startedAt)),
    downloadedBytes,
  });
  const latestResponse = await withTimeout(signal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
    fetchImpl(REDHAT_CSAF_ARCHIVE_LATEST_URL, { signal: requestSignal })
  );
  if (latestResponse.status === 404) {
    await latestResponse.body?.cancel();
    return { status: 'unavailable', url: REDHAT_CSAF_ARCHIVE_LATEST_URL, ...timing(0) };
  }
  await expectOk(latestResponse, `CSAF ${REDHAT_CSAF_ARCHIVE_LATEST_URL}`);
  const nameBody = await withTimeout(signal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
    readCappedTo(latestResponse, MAX_CSAF_ARCHIVE_NAME_BYTES, requestSignal)
  );
  const archiveName = nameBody?.toString('utf8').trim() ?? '';
  if (!CSAF_ARCHIVE_NAME.test(archiveName)) {
    throw new Error(`CSAF ${REDHAT_CSAF_ARCHIVE_LATEST_URL} does not name an archive`);
  }
  const archiveUrl = `${REDHAT_CSAF_BASE_URL}${archiveName}`;

  // The archive's own build time splits "in the archive" from "changed since".
  const headResponse = await withTimeout(signal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
    fetchImpl(archiveUrl, { method: 'HEAD', signal: requestSignal })
  );
  await expectOk(headResponse, `CSAF archive ${archiveUrl}`);
  const lastModified = headResponse.headers.get('last-modified') ?? undefined;
  const nameDate = CSAF_ARCHIVE_NAME_DATE.exec(archiveName)?.[1];
  // No Last-Modified: fall back to the start of the day in the name, a superset of the delta.
  const builtAt = Date.parse(lastModified ?? (nameDate ? `${nameDate}T00:00:00Z` : ''));
  if (!Number.isFinite(builtAt)) {
    throw new Error(`CSAF archive ${archiveUrl} has no usable build time`);
  }

  const changesResponse = await withTimeout(signal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
    fetchImpl(REDHAT_CSAF_CHANGES_URL, { signal: requestSignal })
  );
  await expectOk(changesResponse, `CSAF ${REDHAT_CSAF_CHANGES_URL}`);
  const changesBody = await withTimeout(signal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
    readCappedTo(changesResponse, MAX_CSAF_CHANGES_BYTES, requestSignal)
  );
  if (changesBody === null) {
    throw new Error(`CSAF ${REDHAT_CSAF_CHANGES_URL} is over ${MAX_CSAF_CHANGES_BYTES} bytes`);
  }
  const changedPaths = new Set<string>();
  for (const line of changesBody.toString('utf8').split('\n')) {
    const row = CHANGES_ROW.exec(line.trim());
    if (!row) continue;
    const [, path, changedAt] = row;
    const year = csafYear(path);
    if (year === undefined || year < REDHAT_CSAF_FIRST_YEAR) continue;
    if (Date.parse(changedAt) > builtAt) changedPaths.add(path.replace(/^\.\//, ''));
  }

  const needle = Buffer.from(`redhat:enterprise_linux:${major}`, 'utf8');
  const kept: Buffer[] = [];
  let keptBytes = 0;
  const keep = (doc: Buffer, what: string): void => {
    keptBytes += doc.byteLength;
    if (keptBytes > MAX_CSAF_CORPUS_BYTES) {
      throw new Error(
        `CSAF corpus for RHEL ${major} is over ${MAX_CSAF_CORPUS_BYTES} bytes (${what})`
      );
    }
    kept.push(doc);
  };

  const inArchive = new Set<string>();
  let oversized = 0;
  // The deadline bounds the whole consume (fetch + zstd + tar walk), not just the headers:
  // a server that stalls mid-body must fail the scan instead of hanging the step. Likewise
  // the caller's signal must be visible mid-walk, so both are forwarded into the streaming.
  const walkTar = async (requestSignal: AbortSignal): Promise<void> => {
    const archiveResponse = await fetchImpl(archiveUrl, { signal: requestSignal });
    await expectOk(archiveResponse, `CSAF archive ${archiveUrl}`);
    const zstd = createZstdDecompress();
    const source = bodyToNodeStream(archiveResponse, requestSignal);
    source.on('error', (error) => zstd.destroy(error));
    source.pipe(zstd);
    try {
      const entries = readTarEntries(zstd, {
        onEntry: (path) => inArchive.add(path.replace(/^\.\//, '')),
        select: (path, size) => {
          const year = csafYear(path);
          if (year === undefined || year < REDHAT_CSAF_FIRST_YEAR) return false;
          if (size > MAX_DOCUMENT_BYTES) {
            oversized++;
            return false;
          }
          return true;
        },
      });
      for await (const { path, data } of entries) {
        requestSignal.throwIfAborted();
        if (data.includes(needle)) keep(data, path);
      }
    } finally {
      source.destroy();
      zstd.destroy();
    }
  };
  await withTimeout(signal, CSAF_ARCHIVE_TIMEOUT_MS, walkTar);

  // The true delta is what changes.csv lists that the archive does not contain: Red Hat
  // republishes in-archive advisories continuously, so counting every changed path would
  // trip the cap and churn the etag on every scan. Only paths absent from the archive count.
  const delta = [...changedPaths].filter((path) => !inArchive.has(path));
  const archiveOnlyEtag = `${archiveName}:archive-only`;
  const etag =
    delta.length > MAX_CSAF_DELTA_ADVISORIES
      ? archiveOnlyEtag
      : `${archiveName}:${sortedPathsHash(delta)}`;
  if (delta.length > MAX_CSAF_DELTA_ADVISORIES) {
    logger?.warn(
      `CSAF delta of ${delta.length} advisories since ${archiveName} is over ${MAX_CSAF_DELTA_ADVISORIES}; using the archive alone.`
    );
  }
  // The etag short-circuit covers both modes: an over-cap scan whose cached etag is the
  // archive-only marker must not re-serve the multi-GB archive body on every run.
  if (knownEtag === etag) {
    return { status: 'not_modified', etag, lastModified, ...timing(0) };
  }
  const deltaToFetch = delta.length > MAX_CSAF_DELTA_ADVISORIES ? [] : delta;
  let missing = 0;
  let deltaOversized = 0;
  let next = 0;
  const worker = async (workerSignal: AbortSignal): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= deltaToFetch.length) return;
      workerSignal.throwIfAborted();
      const url = `${REDHAT_CSAF_BASE_URL}${deltaToFetch[i]}`;
      const response = await withTimeout(workerSignal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
        fetchImpl(url, { signal: requestSignal })
      );
      if (response.status === 404) {
        await response.body?.cancel();
        missing++;
        continue;
      }
      await expectOk(response, `CSAF advisory ${url}`);
      const doc = await withTimeout(workerSignal, CSAF_REQUEST_TIMEOUT_MS, (requestSignal) =>
        readCappedTo(response, MAX_DOCUMENT_BYTES, requestSignal)
      );
      if (doc === null) {
        deltaOversized++;
        continue;
      }
      if (doc.includes(needle)) keep(doc, deltaToFetch[i]);
    }
  };
  // One controller for the pool: the first worker failure stops the others' fetches.
  const pool = new AbortController();
  const onCallerAbort = () => pool.abort(signal?.reason);
  if (signal?.aborted) onCallerAbort();
  else signal?.addEventListener('abort', onCallerAbort, { once: true });
  try {
    await Promise.all(
      Array.from({ length: CSAF_FETCH_CONCURRENCY }, () =>
        worker(pool.signal).catch((error) => {
          pool.abort(error);
          throw error;
        })
      )
    );
  } finally {
    signal?.removeEventListener('abort', onCallerAbort);
  }

  if (oversized + deltaOversized + missing > 0) {
    logger?.warn(
      `CSAF corpus for RHEL ${major}: skipped ${
        oversized + deltaOversized
      } advisories over ${MAX_DOCUMENT_BYTES} bytes and ${missing} delta advisories that returned 404.`
    );
  }
  const parts: Uint8Array[] = [Buffer.from('[', 'utf8')];
  kept.forEach((doc, i) => {
    if (i > 0) parts.push(Buffer.from(',', 'utf8'));
    parts.push(doc);
  });
  parts.push(Buffer.from(']', 'utf8'));
  return { status: 'ok', body: Buffer.concat(parts), etag, lastModified, ...timing(keptBytes) };
};
