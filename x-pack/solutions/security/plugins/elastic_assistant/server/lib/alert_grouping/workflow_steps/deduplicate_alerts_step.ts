/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { deduplicateAlertsStepCommonDefinition } from '../../../../common/workflow_steps';
import type {
  ElasticAssistantPluginStart,
  ElasticAssistantPluginStartDependencies,
} from '../../../types';
import {
  HybridClustering,
  getGenericAlertFeatureVector,
  getVal,
  UNIQUE_FIELD,
} from '../services/hybrid_alert_deduplication';
import type { EnrichedAlert, AlertDocument } from '../services/hybrid_alert_deduplication';
import {
  ensureStateIndex,
  loadLeaderState,
  saveLeaderState,
  evictStaleLeaders,
} from './leader_state';
import { createInferenceLLMInvokeFn, resolveConnectorId } from './llm_invoke';
import { buildTagOperations, buildLeaderSummaries } from './build_tag_operations';

const DEFAULT_STATE_INDEX = '.kibana-alert-dedup-state';
const ALERTS_INDEX = '.alerts-security.alerts-default';

/**
 * Factory for the security.deduplicateAlerts workflow step.
 *
 * Runs the HybridClustering engine on input alerts:
 * 1. Deduplicates by event.id
 * 2. Vectorizes alerts
 * 3. Loads persisted leader state
 * 4. Runs Stage 1 (vector) + Stage 2 (LLM) clustering
 * 5. Evicts stale leaders
 * 6. Saves updated leader state
 * 7. Returns leader summaries, metrics, and bulk tag operations
 */
export const getDeduplicateAlertsStepDefinition = (
  coreSetup: CoreSetup<ElasticAssistantPluginStartDependencies, ElasticAssistantPluginStart>
) =>
  createServerStepDefinition({
    ...deduplicateAlertsStepCommonDefinition,
    handler: async (context) => {
      const startTime = Date.now();

      try {
        const rawAlerts = context.input.alerts;
        if (!rawAlerts || rawAlerts.length === 0) {
          return {
            output: {
              leaders: [],
              metrics: {
                alertsProcessed: 0,
                alertsDeduplicated: 0,
                clustersFormed: 0,
                llmCalls: 0,
                durationMs: Date.now() - startTime,
              },
              bulkTagOperations: [],
            },
          };
        }

        context.logger.info(`Processing ${rawAlerts.length} alerts for deduplication`);

        // Extract alert _source from ES search hit format if needed
        const alerts: AlertDocument[] = rawAlerts.map((hit) => {
          if (hit._source && typeof hit._source === 'object') {
            // ES search hit: merge _id into source for ID tracking
            return { _id: hit._id, ...(hit._source as Record<string, unknown>) };
          }
          return hit as AlertDocument;
        });

        // Step 1: Deduplicate by event.id
        const uniqueAlerts = deduplicateByEventId(alerts);
        context.logger.info(
          `After event.id dedup: ${uniqueAlerts.length} unique alerts (from ${alerts.length})`
        );

        // Step 2: Vectorize alerts
        const enrichedAlerts: EnrichedAlert[] = uniqueAlerts.map((alert) => ({
          ...alert,
          vector: getGenericAlertFeatureVector(alert),
        }));

        // Step 3: Load persisted leader state
        const esClient = context.contextManager.getScopedEsClient();
        const workflowContext = context.contextManager.getContext();
        const workflowId = workflowContext.workflow?.id ?? context.stepId;
        const spaceId = workflowContext.workflow?.spaceId ?? 'default';
        const stateIndex = context.config?.['state-index'] ?? DEFAULT_STATE_INDEX;

        await ensureStateIndex(esClient, stateIndex);

        // Step 4: Resolve LLM connector (optional — Stage 2 skipped if unavailable)
        const [, startDeps] = await coreSetup.getStartServices();
        const { inference } = startDeps;
        const request = context.contextManager.getFakeRequest();
        const connectorId = await resolveConnectorId(
          context.config?.['connector-id'],
          inference,
          request
        );

        let invokeLLM;
        if (connectorId) {
          invokeLLM = await createInferenceLLMInvokeFn({
            inference,
            connectorId,
            request,
            abortSignal: context.abortSignal,
          });
          context.logger.info(`LLM connector resolved: ${connectorId}`);
        } else {
          // No-op LLM: Stage 2 will never match (always returns non-duplicate)
          invokeLLM = async () => '{"duplicate": false, "common_fields": []}';
          context.logger.info('No LLM connector available — running vector-only clustering');
        }

        // Step 5: Create clustering engine and load leaders
        const maxLeaders = context.input.maxLeaders ?? 10000;
        const maxLeaderAgeHours = context.input.maxLeaderAgeHours ?? 168;

        const clustering = new HybridClustering({
          config: {
            highConfidenceThreshold: context.input.highConfidenceThreshold,
            lowConfidenceThreshold: context.input.lowConfidenceThreshold,
            rankCutoff: context.input.rankCutoff,
          },
          logger: context.logger as any,
          invokeLLM,
        });

        const existingState = await loadLeaderState(esClient, workflowId, spaceId, stateIndex);
        if (existingState) {
          clustering.loadLeaders(existingState);
          clustering.leaders = evictStaleLeaders(clustering.leaders, maxLeaderAgeHours, maxLeaders);
          context.logger.info(`Loaded ${clustering.leaders.length} leaders from previous run`);
        }

        // Step 6: Run clustering loop
        const leadersBeforeClustering = clustering.leaders.length;
        for (const alert of enrichedAlerts) {
          if (context.abortSignal.aborted) {
            throw new Error('Deduplication cancelled');
          }
          await clustering.clusterAlert(alert);
        }

        // Step 7: Evict stale leaders after clustering
        clustering.leaders = evictStaleLeaders(clustering.leaders, maxLeaderAgeHours, maxLeaders);

        // Step 8: Save updated leader state
        await saveLeaderState(
          esClient,
          workflowId,
          spaceId,
          clustering.serializeLeaders(),
          {
            totalClusters: clustering.leaders.length,
            totalLlmCalls: clustering.llmCalls,
          },
          stateIndex
        );

        // Step 9: Build output
        // Only include leaders that were created/updated in this run
        const newLeaders = clustering.leaders.slice(leadersBeforeClustering);
        const updatedLeaders = clustering.leaders.filter((l) => (l.followers?.length ?? 0) > 0);
        const relevantLeaders = [...new Set([...newLeaders, ...updatedLeaders])];

        const totalFollowers = relevantLeaders.reduce(
          (sum, l) => sum + (l.followers?.length ?? 0),
          0
        );

        const bulkTagOperations = buildTagOperations(relevantLeaders, ALERTS_INDEX);
        const leaders = buildLeaderSummaries(relevantLeaders);

        const metrics = {
          alertsProcessed: enrichedAlerts.length,
          alertsDeduplicated: totalFollowers,
          clustersFormed: clustering.leaders.length,
          llmCalls: clustering.llmCalls,
          durationMs: Date.now() - startTime,
        };

        context.logger.info(
          `Dedup complete: ${metrics.alertsProcessed} processed, ` +
            `${metrics.alertsDeduplicated} deduplicated, ` +
            `${metrics.clustersFormed} clusters, ` +
            `${metrics.llmCalls} LLM calls, ` +
            `${metrics.durationMs}ms`
        );

        return {
          output: {
            leaders,
            metrics,
            bulkTagOperations,
          },
        };
      } catch (error) {
        context.logger.error('Deduplication step failed', error as Error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });

/**
 * Deduplicate alerts by event.id, keeping the first occurrence.
 */
const deduplicateByEventId = (alerts: AlertDocument[]): AlertDocument[] => {
  const seen = new Set<string>();
  const unique: AlertDocument[] = [];

  for (const alert of alerts) {
    const eventId = getVal(alert, UNIQUE_FIELD) as string | undefined;
    if (eventId && seen.has(eventId)) {
      continue;
    }
    if (eventId) {
      seen.add(eventId);
    }
    unique.push(alert);
  }

  return unique;
};
