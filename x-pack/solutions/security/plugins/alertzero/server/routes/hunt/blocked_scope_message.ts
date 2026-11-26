/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntScope } from '@kbn/alertzero-common';
import { blockedScopeGuidance } from '../../services/watches/hunt/common/blocked_scope_guidance';

/** The 409 message a standalone hunt route answers a blocked scope with. */
export const blockedScopeMessage = (
  scope: Pick<HuntScope, 'resolution' | 'policy_skipped' | 'missing'>,
  indexPatterns: string[]
): string =>
  `Hunt scope is blocked (${scope.resolution}): ${
    blockedScopeGuidance(scope, indexPatterns).message
  }`;
