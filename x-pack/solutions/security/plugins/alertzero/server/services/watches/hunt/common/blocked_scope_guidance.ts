/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntScope } from '@kbn/alertzero-common';
import { isIndexExclusion } from '../../../../../common/remote_cluster';
import { NO_SEARCHABLE_PATTERN_MESSAGE, isBlockedByPolicyOnly } from './partition_hunt_universe';

const ADD_A_PATTERN =
  'Add a pattern for the data to hunt to the `securitySolution:defaultIndex` setting.';

/**
 * What to tell the caller when the scope is blocked, keyed on why. `_resolve/index` is
 * cluster-wide and privilege-scoped, so the wording talks about what is visible to this
 * hunt rather than what exists in a space. `indexPatterns` is the list the scope was
 * resolved from.
 */
export const blockedScopeGuidance = (
  scope: Pick<HuntScope, 'resolution' | 'policy_skipped' | 'missing'>,
  indexPatterns: string[]
): { message: string; nextStep: string } => {
  const checked = indexPatterns.join(', ');
  if (scope.resolution === 'blocked:discovery_failed') {
    return {
      message: `Hunt scope resolution failed, so no index was searched (checked: ${checked}).`,
      nextStep:
        "Check Elasticsearch connectivity and the calling user's index privileges, then retry.",
    };
  }
  if (isBlockedByPolicyOnly(scope)) {
    return { message: NO_SEARCHABLE_PATTERN_MESSAGE, nextStep: ADD_A_PATTERN };
  }
  if (indexPatterns.every(isIndexExclusion)) {
    return {
      message:
        'The default data view has no pattern this hunt may search: it holds only exclusions.',
      nextStep: ADD_A_PATTERN,
    };
  }
  return {
    message: `No index in the space's default data view is visible to this hunt (checked: ${checked}).`,
    nextStep:
      "Ingest data into an index the space's Security Solution default data view covers, or adjust the `securitySolution:defaultIndex` setting.",
  };
};
