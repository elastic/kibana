/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';

import { getAlertsIndexForSpace } from '../get_alerts_index_for_space';

/**
 * Asserts that a client-supplied `alerts_index_pattern` targets the caller's
 * own space and nothing else.
 *
 * The Attack Discovery UI always emits the concrete, space-specific alerts
 * index (`.alerts-security.alerts-<spaceId>`), so we require an exact match
 * against `getAlertsIndexForSpace(spaceId)`. Any other value (another space's
 * index, or a cross-space wildcard such as `.alerts-security.alerts-*`) is
 * untrusted input that would read alerts beyond the caller's space boundary,
 * so we reject it with a 400 (via `BadRequestError` + `transformError`).
 */
export const assertAlertsIndexPatternInSpace = ({
  alertsIndexPattern,
  spaceId,
}: {
  alertsIndexPattern: string;
  spaceId: string;
}): void => {
  const expected = getAlertsIndexForSpace(spaceId);

  if (alertsIndexPattern !== expected) {
    throw new BadRequestError(
      `alerts_index_pattern is not permitted for the current space; expected "${expected}"`
    );
  }
};
