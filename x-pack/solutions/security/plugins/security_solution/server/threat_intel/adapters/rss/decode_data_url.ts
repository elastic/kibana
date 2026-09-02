/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Decode a `data:` URL body for offline / fixture RSS feeds.
 *
 * The shared HTTP client only allows http/https, so local generator fixtures
 * that embed the feed as `data:application/rss+xml,...` must be resolved before
 * the network client runs.
 *
 * Supports both percent-encoded and `;base64` payloads.
 */
const MAX_DECODED_BYTES = 10 * 1024 * 1024;
const MAX_DATA_URL_CHARS = MAX_DECODED_BYTES * 3 + 1024;

export const isDataUrl = (url: string): boolean => url.startsWith('data:');

export const decodeDataUrl = (dataUrl: string): string => {
  if (!isDataUrl(dataUrl)) {
    throw new Error(`Expected a data: URL, got "${dataUrl.slice(0, 32)}"`);
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(`Data URL exceeds the ${MAX_DECODED_BYTES}-byte feed cap`);
  }

  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) {
    throw new Error('Invalid data: URL — missing comma separator');
  }

  const meta = dataUrl.slice('data:'.length, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  const isBase64 = /(?:^|;)base64(?:;|$)/i.test(meta);

  // Bound before decoding. Base64 expands to roughly 3/4 of its payload length;
  // percent-encoded payloads are checked after decode.
  if (isBase64) {
    const estimatedDecodedBytes = Math.floor((payload.length * 3) / 4);
    if (estimatedDecodedBytes > MAX_DECODED_BYTES) {
      throw new Error(`Decoded data URL exceeds the ${MAX_DECODED_BYTES}-byte feed cap`);
    }
  }

  const decoded = isBase64
    ? Buffer.from(payload, 'base64').toString('utf8')
    : decodeURIComponent(payload);

  if (Buffer.byteLength(decoded, 'utf8') > MAX_DECODED_BYTES) {
    throw new Error(`Decoded data URL exceeds the ${MAX_DECODED_BYTES}-byte feed cap`);
  }
  return decoded;
};
