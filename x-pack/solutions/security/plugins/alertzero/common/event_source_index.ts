/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Event `source_index` values are workflow-authored and flow straight into a Discover
 * `FROM` clause, so they carry the same trust problem the `alerts[]` refs had. Alerts were
 * fixed by pinning every ref to the current space's alias, but events legitimately span
 * many different data streams, so there is no single index to pin them to. Constrain the
 * shape instead: a concrete, non-hidden, single index that cannot reach across spaces.
 */

/** Alert aliases are space-scoped and must be reached through the pinned alerts exits. */
const ALERTS_INDEX_PREFIX = '.alerts-';
const PREVIEW_ALERTS_INDEX_PREFIX = '.preview.alerts-';
const INTERNAL_ALERTS_INDEX_PREFIX = '.internal.alerts-';

/**
 * Rejects anything that is not a single concrete index/data-stream name:
 *
 * - wildcards (`*`, `?`) — would fan out past the intended source
 * - comma lists and remote-cluster refs (`,`, `:`) — multiple targets in one expression
 * - hidden/system indices (leading `.`) — includes every alerts alias variant
 * - `-` exclusions and leading `+` — index-expression operators, not a plain name
 * - path traversal / whitespace — never valid in an index name
 */
export const isAllowedEventSourceIndex = (value: string): boolean => {
  const index = value.trim();

  if (!index || index !== value) {
    return false;
  }

  // Index expression operators and multi-target syntax.
  if (/[*?,:\s"\\/<>|]/.test(index)) {
    return false;
  }

  if (index.startsWith('-') || index.startsWith('+')) {
    return false;
  }

  // Hidden and system indices, which covers the alerts aliases explicitly called out below.
  if (index.startsWith('.')) {
    return false;
  }

  const lower = index.toLowerCase();
  if (
    lower.startsWith(ALERTS_INDEX_PREFIX) ||
    lower.startsWith(PREVIEW_ALERTS_INDEX_PREFIX) ||
    lower.startsWith(INTERNAL_ALERTS_INDEX_PREFIX)
  ) {
    return false;
  }

  return true;
};

export const EVENT_SOURCE_INDEX_ERROR =
  'source_index must be a single concrete, non-hidden index (no wildcards, lists, remote clusters, or alerts aliases)';
