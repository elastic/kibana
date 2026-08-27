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
  'mc_cid',
  'mc_eid',
]);

/**
 * `ref` is deliberately not in the set above. It is a tracking param on some
 * marketing sites, but GitHub and GitLab use it for branch and commit references
 * (`/tree/main?ref=main`) and technical docs use it for anchors. Threat reports link
 * to repos, CVEs, and vendor docs constantly, so stripping it universally produced
 * wrong canonical keys for exactly the URLs this pipeline sees most and broke their
 * dedup. Strip only the values that are unambiguously campaign tracking.
 */
const TRACKING_REF_VALUES = new Set(['newsletter', 'email', 'twitter', 'rss', 'social']);

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
  // Only strip `www.` when something is left that still looks like a domain.
  // `www.com` is a registered domain, and slicing it blindly produced the bare TLD
  // `com` as a canonical key. Requiring a dot after position 4 means at least three
  // labels are present.
  if (host.startsWith('www.') && host.indexOf('.', 4) !== -1) {
    host = host.slice(4);
  }

  // Include non-default port explicitly so https://foo:8443/x ≠ https://foo/x.
  //
  // Judged against the *output* scheme, which is always https by this point. `URL` only
  // drops a port that is default for the input scheme, so `http://example.com:443/path`
  // kept its port and canonicalized to `https://example.com:443/path` while
  // `https://example.com/path` gave `https://example.com/path`. Two spellings of the same
  // page failed to reconcile, which is the one thing this function exists to prevent.
  const port = parsed.port && parsed.port !== '443' ? `:${parsed.port}` : '';

  // Normalize path: remove trailing slash unless path is bare root
  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Normalize query: remove tracking params, sort remainder for stability
  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    // Prefix match on `utm_`, because the named set is only the common subset and the
    // doc comment promises all of them. Google keeps adding fields
    // (`utm_source_platform`, `utm_creative_format`), and any one left in the key
    // stops two citations of the same article from deduplicating.
    // Lowercased before matching. Query keys are case-sensitive in general, but a tracker
    // spelled `UTM_source` is the same tracker and leaving it in stops two citations of one
    // article from reconciling, which is the whole point of this key.
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

  // Fragment is always dropped
  return `${scheme}//${host}${port}${path}${query ? `?${query}` : ''}`;
};
