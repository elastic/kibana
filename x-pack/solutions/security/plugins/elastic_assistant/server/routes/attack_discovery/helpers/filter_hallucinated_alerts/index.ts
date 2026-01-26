/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscoveries } from '@kbn/elastic-assistant-common';

import { getAlertIdsQuery } from './get_alert_ids_query';
import { getValidDiscoveries } from './get_valid_discoveries';
import { logFilteredDiscoveries } from './log_filtered_discoveries';
import { logUnverifiableDiscoveries } from './log_unverifiable_discoveries';

interface FilterHallucinatedAlertsParams {
  alertsIndexPattern: string;
  attackDiscoveries: AttackDiscoveries;
  esClient: ElasticsearchClient;
  logger: Logger;
}

/**
 * Queries Elasticsearch to filter out generated attack discoveries with hallucinated alert IDs.
 */
export const filterHallucinatedAlerts = async ({
  alertsIndexPattern,
  attackDiscoveries,
  esClient,
  logger,
}: FilterHallucinatedAlertsParams): Promise<AttackDiscoveries> => {
  if (attackDiscoveries.length === 0) {
    return attackDiscoveries;
  }

  // 1. Filter out discoveries with empty alertIds (cannot be verified)
  const verifiableDiscoveries = attackDiscoveries.filter(
    (discovery) => discovery.alertIds.length > 0
  );

  logUnverifiableDiscoveries(logger, attackDiscoveries, verifiableDiscoveries);

  if (verifiableDiscoveries.length === 0) {
    return [];
  }

  // 2. Collect all unique alert IDs from all discoveries (deduplicate to minimize ES query size)
  const uniqueAlertIds = new Set(verifiableDiscoveries.flatMap((discovery) => discovery.alertIds));

  // 3. Query ES once for all unique alert IDs
  const query = getAlertIdsQuery(alertsIndexPattern, [...uniqueAlertIds]);
  const searchResult = await esClient.search(query);

  // 4. Build a Set of alert IDs that actually exist and filter discoveries
  const existingAlertIds = new Set(
    searchResult.hits.hits.map((hit) => hit._id).filter((id): id is string => id != null)
  );

  const validDiscoveries = getValidDiscoveries({
    attackDiscoveries: verifiableDiscoveries,
    existingAlertIds,
  });

  // 5. Log information about filtered discoveries
  logFilteredDiscoveries(logger, attackDiscoveries, validDiscoveries, existingAlertIds);

  return validDiscoveries;
};
