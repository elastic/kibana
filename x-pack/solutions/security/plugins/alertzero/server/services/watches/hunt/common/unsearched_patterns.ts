/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntScope } from '@kbn/alertzero-common';
import { isIndexExclusion, stripBackingPrefix } from '../../../../../common/remote_cluster';
import { scopeGuardPatterns } from './cps_scope';
import { buildMatchesRequired } from './matches_required';

/**
 * The names a scope dropped from the search: entries of `missing` that are absent from
 * `index_patterns` and that no exclusion entry of the data view covers (a name the data view
 * excludes itself resolved nothing by design). Meaningful only for a scope that is not blocked.
 */
export const unsearchedPatterns = (
  scope: Pick<HuntScope, 'index_patterns' | 'missing'>,
  crossProjectSearch: boolean
): string[] => {
  const exclusionEntries = scope.index_patterns.filter(isIndexExclusion);
  const kept = new Set(scope.index_patterns);
  const dropped = Array.from(new Set(scope.missing)).filter((entry) => !kept.has(entry));
  return dropped.filter((entry) => {
    const bare = stripBackingPrefix(entry);
    // Still matched once the exclusions are applied means nothing excludes it.
    return buildMatchesRequired(
      scopeGuardPatterns([bare, ...exclusionEntries], crossProjectSearch)
    )(bare);
  });
};
