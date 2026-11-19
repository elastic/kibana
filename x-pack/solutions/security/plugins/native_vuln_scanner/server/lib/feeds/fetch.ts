/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bunzip2Blocks } from './bzip2';
import { parseRhelOval } from './rhel_oval';
import type { FeedParseResult } from './types';
import { parseUbuntuOval } from './ubuntu_oval';

export type FeedOs = FeedParseResult['os'];

/** The largest compressed feed we accept; the biggest today (Ubuntu noble) is about 12 MB. */
export const MAX_FEED_BYTES = 64 * 1024 * 1024;

/** Decompressed output cap; the download cap alone does not bound it. */
export const MAX_DECOMPRESSED_FEED_BYTES = 512 * 1024 * 1024;

/** The unpatched RHEL feed decompresses to about 658 MB; it gets a larger cap. */
export const MAX_DECOMPRESSED_UNPATCHED_FEED_BYTES = 768 * 1024 * 1024;

const UBUNTU_CODENAME = /^[a-z]+$/;
const RHEL_MAJOR = /^[1-9]\d*$/;

export interface FeedUrlOptions {
  /** RHEL: use the feed that also carries unpatched (unfixed CVE) definitions. */
  includeUnfixed?: boolean;
}

/**
 * Vendor OVAL feed for one OS release. The release comes from host-reported data, so it is
 * validated before it becomes part of a URL.
 */
export const feedUrl = (
  { family, version }: FeedOs,
  { includeUnfixed }: FeedUrlOptions = {}
): string => {
  if (family === 'ubuntu' && UBUNTU_CODENAME.test(version)) {
    return `https://security-metadata.canonical.com/oval/com.ubuntu.${version}.cve.oval.xml.bz2`;
  }
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
  | ({ status: 'ok'; body: Uint8Array } & FeedHeaders)
  /** The vendor answered 304 to the `etag` the caller sent. */
  | ({ status: 'not_modified' } & FeedHeaders)
  /** The vendor publishes no feed for this release (HTTP 404), e.g. RHEL 10 or an EOL codename. */
  | { status: 'unavailable'; url: string };

export type LoadFeedResult =
  | ({ status: 'ok'; feed: FeedParseResult } & FeedHeaders)
  /** The vendor publishes no feed for this release (HTTP 404), e.g. RHEL 10 or an EOL codename. */
  | { status: 'unavailable'; url: string };

export interface DownloadFeedOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Sent as `If-None-Match`, so an unchanged feed costs no body. */
  etag?: string;
  /** RHEL: fetch the feed that also carries unpatched (unfixed CVE) definitions. */
  includeUnfixed?: boolean;
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

/** Reads the body, refusing anything over {@link MAX_FEED_BYTES} even without a content-length. */
const readCapped = async (response: Response, url: string): Promise<Uint8Array> => {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_FEED_BYTES) {
    await response.body?.cancel();
    throw tooLarge(url, declared);
  }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FEED_BYTES) {
      await reader.cancel();
      throw tooLarge(url, total);
    }
    chunks.push(value);
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
  { signal, fetchImpl = fetch, etag: knownEtag, includeUnfixed }: DownloadFeedOptions = {}
): Promise<DownloadFeedResult> => {
  const url = feedUrl(os, { includeUnfixed });
  const response = await fetchImpl(url, {
    signal,
    headers: knownEtag ? { 'if-none-match': knownEtag } : undefined,
  });
  if (response.status === 304) {
    await response.body?.cancel();
    return {
      status: 'not_modified',
      etag: response.headers.get('etag') ?? knownEtag,
      lastModified: response.headers.get('last-modified') ?? undefined,
    };
  }
  if (response.status === 404) {
    await response.body?.cancel();
    return { status: 'unavailable', url };
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Advisory feed ${url} returned HTTP ${response.status}`);
  }
  const body = await readCapped(response, url);
  const etag = response.headers.get('etag') ?? undefined;
  const lastModified = response.headers.get('last-modified') ?? undefined;
  return { status: 'ok', body, etag, lastModified };
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

/** Downloads, decompresses and parses the advisory feed for one OS release. */
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
  return { status: 'ok', feed, etag, lastModified };
};
