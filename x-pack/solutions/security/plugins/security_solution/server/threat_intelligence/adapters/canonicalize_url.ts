/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tracking query-param names stripped during canonicalization.
 * Extend here if new common trackers appear; keep the list small and named.
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
  'ref',
  'mc_cid',
  'mc_eid',
]);

/**
 * Produce a stable match key for a URL, suitable for reconciling the same URL
 * cited across sources (e.g. a Maltrail `external_references` entry ↔ an
 * ingested report's `source.url`). The router matches on this key.
 *
 * Normalizations applied:
 *   - scheme: http → https (treat as equivalent for key purposes)
 *   - host: lowercased, leading `www.` stripped
 *   - path: trailing slash removed (except bare-root, which stays `/`)
 *   - query: tracking params removed (utm_*, fbclid, gclid, ref, mc_cid, mc_eid)
 *   - fragment: dropped entirely
 *
 * Returns `undefined` for unparseable input so callers can safely skip the field.
 *
 * TODO(router): reconcile external_references.canonical_url against ingested
 * report source.url (canonicalized at read time) to surface Maltrail references
 * that point to already-ingested blog posts.
 */
export const canonicalizeUrl = (rawUrl: string): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return undefined;
  }

  // Normalize scheme: treat http and https as equivalent
  const scheme = parsed.protocol === 'http:' ? 'https:' : parsed.protocol;
  if (scheme !== 'https:') {
    // Non-http(s) URLs (ftp, data, etc.) are not meaningful match keys
    return undefined;
  }

  // Normalize host: lowercase + strip leading www.
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  // Include non-default port explicitly so https://foo:8443/x ≠ https://foo/x
  const port = parsed.port ? `:${parsed.port}` : '';

  // Normalize path: remove trailing slash unless path is bare root
  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Normalize query: remove tracking params, sort remainder for stability
  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(key)) {
      params.append(key, value);
    }
  }
  params.sort();
  const query = params.toString();

  // Fragment is always dropped
  return `${scheme}//${host}${port}${path}${query ? `?${query}` : ''}`;
};
