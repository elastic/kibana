/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Constrain `source_index` to a concrete, non-hidden, single index that cannot reach across
 * spaces. Event `source_index` values are workflow-authored and flow straight into a
 * Discover `FROM` clause, so they carry the same trust problem the `alerts[]` refs had, but
 * events legitimately span many different data streams, so there is no single index to pin
 * them to.
 *
 * Writers MUST populate `source_index` from the hit's `_index` (for a data stream, that is
 * the concrete `.ds-...` backing index), never from the data stream or alias name that was
 * searched. `_index` on a data-stream hit already reports the backing name, so this is a
 * matter of not overriding it.
 */

/**
 * Backing indices of ordinary data streams. A search hit against a data stream reports its
 * concrete backing name in `_index` (e.g. `.ds-logs-endpoint.events.process-default-...`),
 * and the contract says `source_index` carries that concrete source, so these have to be
 * allowed even though they start with a dot. They are still a single concrete index.
 */
const DATA_STREAM_BACKING_PREFIX = '.ds-';

/**
 * Rejects anything that is not a single concrete index/data-stream name:
 *
 * - wildcards (`*`, `?`) — would fan out past the intended source
 * - comma lists and remote-cluster refs (`,`, `:`) — multiple targets in one expression
 * - hidden/system indices (leading `.`), except `.ds-` backing indices — includes every
 *   alerts alias variant, since alias names still start with `.` after the `.ds-` strip
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

  const lower = index.toLowerCase();

  // A data stream's backing index is a legitimate concrete source. Strip the prefix and hold
  // the remainder to the same rules, so `.ds-.alerts-...` is still rejected below.
  const isDataStreamBacking = lower.startsWith(DATA_STREAM_BACKING_PREFIX);
  const bare = isDataStreamBacking ? lower.slice(DATA_STREAM_BACKING_PREFIX.length) : lower;

  if (!bare) {
    return false;
  }

  // Hidden and system indices, which covers every alerts alias variant (they all start
  // with `.`).
  if (bare.startsWith('.')) {
    return false;
  }

  return true;
};

export const EVENT_SOURCE_INDEX_ERROR =
  'source_index must be a single concrete, non-hidden index (no wildcards, lists, remote clusters, or alerts aliases)';
