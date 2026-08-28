/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
]);

// Technical sites give `ref` semantic meaning, so only known campaign values are tracking.
const TRACKING_REF_VALUES = new Set(['newsletter', 'email', 'twitter', 'rss', 'social']);

/** Produces a stable HTTPS reconciliation key, or undefined for unsupported URLs. */
export const canonicalizeUrl = (rawUrl: string): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return undefined;
  }

  const scheme = parsed.protocol === 'http:' ? 'https:' : parsed.protocol;
  if (scheme !== 'https:') {
    return undefined;
  }

  let host = parsed.hostname.toLowerCase();
  if (host.length > 1 && host.endsWith('.')) {
    host = host.slice(0, -1);
  }
  // Keep registered two-label domains such as www.com intact.
  if (host.startsWith('www.') && host.indexOf('.', 4) !== -1) {
    host = host.slice(4);
  }

  // Judge the default port against the normalized output scheme.
  const port = parsed.port && parsed.port !== '443' ? `:${parsed.port}` : '';

  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    const isTracking =
      lowerKey.startsWith('utm_') ||
      TRACKING_PARAMS.has(lowerKey) ||
      (lowerKey === 'ref' && TRACKING_REF_VALUES.has(value.toLowerCase()));
    if (!isTracking) {
      params.append(key, value);
    }
  }
  params.sort();
  const query = params.toString();

  return `${scheme}//${host}${port}${path}${query ? `?${query}` : ''}`;
};
