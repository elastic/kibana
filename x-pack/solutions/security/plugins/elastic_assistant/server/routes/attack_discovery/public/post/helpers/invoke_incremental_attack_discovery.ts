/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiConfig, AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Document } from '@langchain/core/documents';

import { incrementalAttackDiscovery } from '../../../../../lib/attack_discovery/incremental';
import type {
  IncrementalMode,
  Alert,
  IncrementalADConfig,
} from '../../../../../lib/attack_discovery/incremental/types';
import { invokeAttackDiscoveryGraph } from './invoke_attack_discovery_graph';

export interface InvokeIncrementalAttackDiscoveryParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ApiConfig;
  connectorTimeout: number;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  incrementalConfig: Partial<IncrementalADConfig>;
  langSmithProject?: string;
  langSmithApiKey?: string;
  latestReplacements: Replacements;
  logger: Logger;
  mode: IncrementalMode;
  onNewReplacements: (newReplacements: Replacements) => void;
  savedObjectsClient: SavedObjectsClientContract;
  sessionId: string;
  start?: string;
  size: number;
}

/**
 * Invokes incremental attack discovery with delta or progressive mode
 *
 * This wrapper orchestrates the incremental processing by:
 * 1. Fetching alerts from Elasticsearch
 * 2. Using incrementalAttackDiscovery to process in bounded rounds
 * 3. Calling the existing attack discovery graph for each round
 * 4. Tracking processed alerts across runs (for delta mode)
 *
 * @param params - Configuration for incremental attack discovery
 * @returns Attack discoveries and anonymized alerts
 */
export const invokeIncrementalAttackDiscovery = async ({
  actionsClient,
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  connectorTimeout,
  end,
  esClient,
  filter,
  incrementalConfig,
  langSmithProject,
  langSmithApiKey,
  latestReplacements,
  logger,
  mode,
  onNewReplacements,
  savedObjectsClient,
  sessionId,
  start,
  size,
}: InvokeIncrementalAttackDiscoveryParams): Promise<{
  anonymizedAlerts: Document[];
  attackDiscoveries: AttackDiscovery[] | null;
}> => {
  logger.debug(() => `Invoking incremental attack discovery in ${mode} mode`);

  // Fetch all alerts matching the query from Elasticsearch
  const alertsResponse = await esClient.search({
    index: alertsIndexPattern,
    size,
    query: {
      bool: {
        must: [
          ...(start || end
            ? [
                {
                  range: {
                    '@timestamp': {
                      ...(start ? { gte: start } : {}),
                      ...(end ? { lte: end } : {}),
                    },
                  },
                },
              ]
            : []),
          ...(filter ? [filter] : []),
        ],
      },
    },
    sort: [{ '@timestamp': 'desc' }],
    _source: true,
  });

  const alerts: Alert[] = alertsResponse.hits.hits.map(hit => ({
    id: hit._id as string,
    content: JSON.stringify(hit._source),
    timestamp: (hit._source as any)['@timestamp'] as string,
  }));

  logger.debug(() => `Fetched ${alerts.length} alerts for incremental processing`);

  // Track anonymized alerts across all rounds
  const allAnonymizedAlerts: Document[] = [];

  // Generate insights using the existing graph (this is the callback for each round)
  const generateInsights = async (
    roundAlerts: Alert[],
    previousInsights?: AttackDiscovery[]
  ): Promise<AttackDiscovery[]> => {
    // For each round, we call the existing attack discovery graph
    // with the subset of alerts for this round
    const { anonymizedAlerts, attackDiscoveries } = await invokeAttackDiscoveryGraph({
      actionsClient,
      alertsIndexPattern,
      anonymizationFields,
      apiConfig,
      connectorTimeout,
      end,
      esClient,
      filter,
      langSmithProject,
      langSmithApiKey,
      latestReplacements,
      logger,
      onNewReplacements,
      savedObjectsClient,
      size: roundAlerts.length, // Process only the alerts in this round
      start,
    });

    // Collect anonymized alerts from this round
    allAnonymizedAlerts.push(...anonymizedAlerts);

    return attackDiscoveries ?? [];
  };

  // Run incremental attack discovery
  const result = await incrementalAttackDiscovery({
    mode,
    alerts,
    existingInsights: [], // Could be loaded from previous runs
    config: incrementalConfig,
    esClient,
    sessionId,
    generateInsights,
  });

  logger.debug(
    () =>
      `Incremental attack discovery completed: ${result.stats.totalRounds} rounds, ${result.stats.totalAlertsProcessed} alerts processed`
  );

  // Return in the format expected by the existing code
  return {
    anonymizedAlerts: allAnonymizedAlerts,
    attackDiscoveries: result.insights,
  };
};
