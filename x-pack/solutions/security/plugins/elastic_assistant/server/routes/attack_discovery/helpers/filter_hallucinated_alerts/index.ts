/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscoveries } from '@kbn/elastic-assistant-common';
import { filterHallucinatedAlerts as filterHallucinatedAlertsShared } from '@kbn/discoveries';

interface FilterHallucinatedAlertsParams {
  alertsIndexPattern: string;
  attackDiscoveries: AttackDiscoveries;
  esClient: ElasticsearchClient;
  logger: Logger;
}

/**
 * Queries Elasticsearch to filter out generated attack discoveries with hallucinated alert IDs.
 * This is a wrapper around the shared implementation from @kbn/discoveries.
 */
export const filterHallucinatedAlerts = async ({
  alertsIndexPattern,
  attackDiscoveries,
  esClient,
  logger,
}: FilterHallucinatedAlertsParams): Promise<AttackDiscoveries> => {
  return filterHallucinatedAlertsShared({
    alertsIndexPattern,
    attackDiscoveries,
    esClient,
    logger,
  });
};
