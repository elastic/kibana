/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base name of the security solution alerts index, without the space suffix.
 * The per-space alerts index is `${ALERTS_INDEX_BASE}-<spaceId>`.
 */
const ALERTS_INDEX_BASE = '.alerts-security.alerts' as const;

/**
 * Returns the space-specific security alerts index for the given Kibana space,
 * e.g. `default` -> `.alerts-security.alerts-default`.
 *
 * Deriving the index from the resolved space (rather than hardcoding `-default`
 * or using the cross-space `-*` wildcard) keeps Attack Discovery alert
 * retrieval bounded to the caller's own space.
 */
export const getAlertsIndexForSpace = (spaceId: string): string =>
  `${ALERTS_INDEX_BASE}-${spaceId}`;
