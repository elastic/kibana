/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitRemoteCluster, stripBackingPrefix } from './remote_cluster';

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
 *
 * This constrains the shape, not the target: neither a local index name nor a `<cluster>:`
 * alias is checked against the space's hunt scope, so a forged ref can name any index or any
 * remote cluster configured on the deployment. Opening it still runs as the viewing user, under
 * their own index and remote-cluster privileges.
 */

/** Index expression operators and multi-target syntax, for either side of a `<cluster>:`. */
const isPlainName = (name: string): boolean =>
  name !== '' && !/[*?,:\s"\\/<>|]/.test(name) && !name.startsWith('-') && !name.startsWith('+');

/**
 * Rejects anything that is not a single concrete index/data-stream name, optionally on one
 * named remote cluster (`infosec_zocalo:.ds-logs-aws...`, which is how a cross-cluster hit
 * reports its `_index`):
 *
 * - wildcards (`*`, `?`) — would fan out past the intended source, cluster alias included
 * - comma lists, a second `:`, and `::` selectors — multiple targets or components in one
 *   expression
 * - hidden/system indices (leading `.`), except `.ds-` backing indices — includes every
 *   alerts alias variant, since alias names still start with `.` after the `.ds-` strip
 * - `-` exclusions and leading `+` — index-expression operators, not a plain name
 * - path traversal / whitespace — never valid in an index name
 */
export const isAllowedEventSourceIndex = (value: string): boolean => {
  if (!value || value.trim() !== value) {
    return false;
  }

  const { cluster, index } = splitRemoteCluster(value);
  // A leading `_` is an ES|QL mode prefix (`_coordinator:`), not a remote cluster alias.
  if (
    (cluster !== undefined && (!isPlainName(cluster) || cluster.startsWith('_'))) ||
    !isPlainName(index)
  ) {
    return false;
  }

  const lower = index.toLowerCase();

  // A data stream's backing index is a legitimate concrete source even though it starts with
  // a dot: a hit reports it in `_index`. Strip the prefix and hold the remainder to the same
  // rules, so `.ds-.alerts-...` is still rejected below.
  const bare = stripBackingPrefix(lower);

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
  'source_index must be a single concrete, non-hidden index, optionally prefixed by one remote cluster (no wildcards, lists, or alerts aliases)';
