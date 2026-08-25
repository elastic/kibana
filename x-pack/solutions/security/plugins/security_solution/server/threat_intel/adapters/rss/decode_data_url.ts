/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Decode a `data:` URL body for offline / fixture RSS feeds.
 *
 * Mustard's shared `fetchUrl` SSRF guard only allows http/https, so local
 * generator fixtures that embed the feed as `data:application/rss+xml,...`
 * must be resolved before the network client runs.
 *
 * Supports both percent-encoded and `;base64` payloads.
 */
export const isDataUrl = (url: string): boolean => url.startsWith('data:');

export const decodeDataUrl = (dataUrl: string): string => {
  if (!isDataUrl(dataUrl)) {
    throw new Error(`Expected a data: URL, got "${dataUrl.slice(0, 32)}"`);
  }

  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) {
    throw new Error('Invalid data: URL — missing comma separator');
  }

  const meta = dataUrl.slice('data:'.length, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  const isBase64 = /(?:^|;)base64(?:;|$)/i.test(meta);

  if (isBase64) {
    return Buffer.from(payload, 'base64').toString('utf8');
  }

  return decodeURIComponent(payload);
};
