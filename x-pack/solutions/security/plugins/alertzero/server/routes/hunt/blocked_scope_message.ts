/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntScope } from '@kbn/alertzero-common';
import {
  NO_SEARCHABLE_PATTERN_MESSAGE,
  isBlockedByPolicyOnly,
} from '../../services/watches/hunt/common/partition_hunt_universe';

/** The 409 message a standalone hunt route answers a blocked scope with. */
export const blockedScopeMessage = (
  scope: Pick<HuntScope, 'resolution' | 'policy_skipped' | 'missing'>,
  indexPatterns: string[]
): string =>
  isBlockedByPolicyOnly(scope)
    ? `Hunt scope is blocked (${scope.resolution}): ${NO_SEARCHABLE_PATTERN_MESSAGE}`
    : `Hunt scope is blocked (${
        scope.resolution
      }): nothing in the default data view is visible to this hunt (checked: ${indexPatterns.join(
        ', '
      )})`;
