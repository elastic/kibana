/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryWithAlertIds } from '../types';
import { getAlertIds } from '../types';

/**
 * Filters attack discoveries to keep only those where ALL alert IDs exist in Elasticsearch.
 * Discoveries with empty alertIds arrays are filtered out (they cannot be verified).
 * Callers that need to preserve unverifiable discoveries must handle them separately.
 */
export const getValidDiscoveries = <T extends DiscoveryWithAlertIds>({
  attackDiscoveries,
  existingAlertIds,
}: {
  attackDiscoveries: T[];
  existingAlertIds: Set<string>;
}): T[] =>
  attackDiscoveries.filter((discovery) => {
    const alertIds = getAlertIds(discovery);
    return alertIds.length > 0 && alertIds.every((alertId) => existingAlertIds.has(alertId));
  });
