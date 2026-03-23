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

import { getAnonymizedAlerts } from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever/helpers/get_anonymized_alerts';
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

  // Step 1: Fetch and anonymize ALL alerts once upfront
  // This reuses the same fetch + anonymization logic as the standard AD graph
  const anonymizedAlertStrings = await getAnonymizedAlerts({
    alertsIndexPattern,
    anonymizationFields,
    end,
    esClient,
    filter,
    onNewReplacements,
    replacements: latestReplacements,
    size,
    start,
  });

  // Step 2: Build Alert objects from the anonymized strings
  // Each alert's content is already the anonymized CSV — this is what the LLM sees
  const alerts: Alert[] = anonymizedAlertStrings.map((content, i) => ({
    id: `alert-${i}`,
    content,
    timestamp: new Date().toISOString(),
  }));

  logger.debug(() => `Fetched and anonymized ${alerts.length} alerts for incremental processing`);

  // Track all anonymized documents across rounds for the response
  const allAnonymizedDocs: Document[] = [];

  // Step 3: Generate insights callback — passes round-specific alerts to the graph
  // The graph's entry edge skips ES fetch when anonymizedDocuments is pre-populated
  const generateInsights = async (
    roundAlerts: Alert[],
    previousInsights?: AttackDiscovery[]
  ): Promise<AttackDiscovery[]> => {
    // Convert round alerts back to Document objects for the graph
    const roundDocuments: Document[] = roundAlerts.map((a) => ({
      pageContent: a.content,
      metadata: {},
    }));

    // Invoke the graph with pre-fetched documents — bypasses internal ES fetch
    const { anonymizedAlerts: returnedDocs, attackDiscoveries } =
      await invokeAttackDiscoveryGraph({
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
        size: roundAlerts.length,
        start,
        anonymizedDocuments: roundDocuments,
      });

    allAnonymizedDocs.push(...returnedDocs);
    return attackDiscoveries ?? [];
  };

  // Step 4: Run incremental attack discovery orchestration
  const result = await incrementalAttackDiscovery({
    mode,
    alerts,
    existingInsights: [],
    config: incrementalConfig,
    esClient,
    sessionId,
    generateInsights,
  });

  logger.debug(
    () =>
      `Incremental attack discovery completed: ${result.stats.totalRounds} rounds, ${result.stats.totalAlertsProcessed} alerts processed`
  );

  return {
    anonymizedAlerts: allAnonymizedDocs,
    attackDiscoveries: result.insights,
  };
};
