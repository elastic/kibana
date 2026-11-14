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

/**
 * The largest decompressed feed we accept. bzip2 expands up to ~1.4 GB per block, so the
 * 64 MiB cap on the download bounds nothing once decompression starts.
 */
export const MAX_DECOMPRESSED_FEED_BYTES = 512 * 1024 * 1024;

const UBUNTU_CODENAME = /^[a-z]+$/;
const RHEL_MAJOR = /^[1-9]\d*$/;

/**
 * Vendor OVAL feed for one OS release. The release comes from host-reported data, so it is
 * validated before it becomes part of a URL.
 */
export const feedUrl = ({ family, version }: FeedOs): string => {
  if (family === 'ubuntu' && UBUNTU_CODENAME.test(version)) {
    return `https://security-metadata.canonical.com/oval/com.ubuntu.${version}.cve.oval.xml.bz2`;
  }
  if (family === 'rhel' && RHEL_MAJOR.test(version)) {
    return `https://security.access.redhat.com/data/oval/v2/RHEL${version}/rhel-${version}.oval.xml.bz2`;
  }
  throw new Error(`No advisory feed for ${family} ${version}`);
};

export type LoadFeedResult =
  | { status: 'ok'; feed: FeedParseResult }
  /** The vendor publishes no feed for this release (HTTP 404), e.g. RHEL 10 or an EOL codename. */
  | { status: 'unavailable'; url: string };

export interface LoadFeedOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Overrides {@link MAX_DECOMPRESSED_FEED_BYTES}; for tests. */
  maxDecompressedBytes?: number;
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

/**
 * Counts decompressed output and checks the abort signal between blocks, so a hostile feed
 * decompressing to gigabytes cannot pin the CPU and an abort stops the parse, not just the
 * download.
 */
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

/** Downloads, decompresses and parses the advisory feed for one OS release. */
export const loadFeed = async (
  os: FeedOs,
  { signal, fetchImpl = fetch, maxDecompressedBytes }: LoadFeedOptions = {}
): Promise<LoadFeedResult> => {
  const url = feedUrl(os);
  const response = await fetchImpl(url, { signal });
  if (response.status === 404) {
    await response.body?.cancel();
    return { status: 'unavailable', url };
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Advisory feed ${url} returned HTTP ${response.status}`);
  }
  const body = await readCapped(response, url);
  const blocks = guardBlocks(
    bunzip2Blocks(body),
    url,
    signal,
    maxDecompressedBytes ?? MAX_DECOMPRESSED_FEED_BYTES
  );
  const feed =
    os.family === 'ubuntu'
      ? await parseUbuntuOval(blocks, { release: os.version })
      : await parseRhelOval(blocks, { major: os.version });
  return { status: 'ok', feed };
};
