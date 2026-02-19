/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveries } from '@kbn/elastic-assistant-common';

/**
 * Filters attack discoveries to keep only those where ALL alert IDs exist in Elasticsearch.
 * Discoveries with empty alertIds arrays are filtered out.
 */
export const getValidDiscoveries = ({
  attackDiscoveries,
  existingAlertIds,
}: {
  attackDiscoveries: AttackDiscoveries;
  existingAlertIds: Set<string>;
}): AttackDiscoveries =>
  attackDiscoveries.filter(
    (discovery) =>
      discovery.alertIds.length > 0 && // filters out discoveries with empty alertIds arrays
      discovery.alertIds.every((alertId) => existingAlertIds.has(alertId))
  );
