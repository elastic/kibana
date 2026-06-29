/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 3

export interface ValidateAttackDiscoveriesResult {
  duplicates_dropped_count: number;
  validated_discoveries: unknown[];
}

export const validateAttackDiscoveries = async (
  _params: unknown
): Promise<ValidateAttackDiscoveriesResult> => ({
  duplicates_dropped_count: 0,
  validated_discoveries: [],
});
