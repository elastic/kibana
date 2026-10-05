/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import type { SignificantEventsKIsOnboardingClient } from '../workflows/onboarding_workflow_client';

const V1_ALERTS_INDEX = '.alerts-streams.alerts-default';

/** Deleted counts returned by the one-time Significant Events orphan-cleanup API. */
export interface SignificantEventsResetDeletedCounts {
  queries: number;
  features: number;
  /** Backing rule IDs targeted across the v1 and v2 stores. */
  rules: number;
  alerts_v1: number;
}

/** Response from POST /internal/streams/significant_events/_reset_kis. */
export interface SignificantEventsResetResult {
  /** Source ids that had knowledge indicators before the reset. */
  sources: string[];
  canceled_onboarding_count: number;
  deleted: SignificantEventsResetDeletedCounts;
  /** Per-source KI and rule snapshot counts before deletion. */
  by_source: Record<string, SignificantEventsResetDeletedCounts>;
}

export const emptySignificantEventsResetDeletedCounts =
  (): SignificantEventsResetDeletedCounts => ({
    queries: 0,
    features: 0,
    rules: 0,
    alerts_v1: 0,
  });

const sumDeletedCounts = (
  totals: SignificantEventsResetDeletedCounts,
  sourceCounts: SignificantEventsResetDeletedCounts
): void => {
  totals.queries += sourceCounts.queries;
  totals.features += sourceCounts.features;
  totals.rules += sourceCounts.rules;
};

interface ResetSnapshot {
  sourceIds: string[];
  ruleIds: string[];
  bySource: Record<string, SignificantEventsResetDeletedCounts>;
}

const collectResetSnapshot = async (kiClient: KnowledgeIndicatorClient): Promise<ResetSnapshot> => {
  const sourceIds = await kiClient.getStreamNamesWithKnowledgeIndicators();
  const bySource: Record<string, SignificantEventsResetDeletedCounts> = {};
  const ruleIds = new Set<string>();

  for (const sourceId of sourceIds) {
    const sourceCounts = emptySignificantEventsResetDeletedCounts();
    const { [sourceId]: queryLinks = [] } = await kiClient.getStreamToQueryLinksMap([sourceId], {
      includeExpired: true,
    });
    sourceCounts.queries = queryLinks.length;
    for (const link of queryLinks) {
      if (link.rule_backed && link.rule_id) {
        ruleIds.add(link.rule_id);
      }
    }
    sourceCounts.rules = queryLinks.filter((link) => link.rule_backed && link.rule_id).length;

    // Match `deleteIndicators`, which tombstones every non-deleted feature: count excluded and
    // expired features too, otherwise this snapshot undercounts what the reset actually deletes.
    const { hits: features } = await kiClient.getFeatures(sourceId, {
      includeExcluded: true,
      includeExpired: true,
    });
    sourceCounts.features = features.length;

    bySource[sourceId] = sourceCounts;
  }

  return {
    sourceIds,
    ruleIds: [...ruleIds],
    bySource,
  };
};

const resetStreamKnowledgeIndicators = async ({
  sourceId,
  kiClient,
  ruleIds,
  logger,
}: {
  sourceId: string;
  kiClient: KnowledgeIndicatorClient;
  ruleIds: string[];
  logger: Logger;
}): Promise<void> => {
  try {
    await kiClient.deleteAllQueries(sourceId);
    await kiClient.deleteIndicators(sourceId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const orphanContext =
      ruleIds.length > 0 ? ` candidateOrphanedRuleIds=[${ruleIds.join(',')}]` : '';
    logger.error(
      `Significant events reset failed for source ${sourceId} during KI cleanup: ${errorMessage}.${orphanContext}`
    );
    throw error;
  }
};

export interface ResetSignificantEventsDeps {
  kiClient: KnowledgeIndicatorClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  deleteLegacyRules: (ruleIds: string[]) => Promise<void>;
}

/**
 * One-time cleanup for clusters that may still contain experimental alerting v1 state.
 *
 * TODO: Remove after the time-boxed follow-up to nightshift-program#651 confirms that no
 * supported upgrade path can contain Significant Events v1 rules or alerts.
 */
export const resetSignificantEvents = async ({
  kiClient,
  esClient,
  logger,
  request,
  streamsKIsOnboardingClient,
  deleteLegacyRules,
}: ResetSignificantEventsDeps): Promise<SignificantEventsResetResult> => {
  const canceledOnboardingCount = await streamsKIsOnboardingClient.cancelAllRunning({ request });
  const { sourceIds, ruleIds, bySource } = await collectResetSnapshot(kiClient);

  const deleted = emptySignificantEventsResetDeletedCounts();
  for (const sourceCounts of Object.values(bySource)) {
    sumDeletedCounts(deleted, sourceCounts);
  }
  deleted.rules = ruleIds.length;

  // Delete v1 rules before removing their KI links so a failure remains retryable. Missing rules
  // are expected for v2-backed links and are ignored by the cleanup-only v1 client.
  await deleteLegacyRules(ruleIds);

  for (const sourceId of sourceIds) {
    logger.info(`Significant events reset: clearing KIs and rules for source "${sourceId}"`);
    await resetStreamKnowledgeIndicators({ sourceId, kiClient, ruleIds, logger });
  }

  // `.alerts-streams.alerts-default` is shared across spaces, so `match_all` wipes v1 alerts
  // everywhere. KI and rule deletion above follows `kiClient`.
  const alertsDeleteResponse = await esClient.deleteByQuery(
    {
      index: V1_ALERTS_INDEX,
      conflicts: 'proceed',
      query: { match_all: {} },
    },
    { ignore: [404] }
  );
  deleted.alerts_v1 = alertsDeleteResponse.deleted ?? 0;

  return {
    sources: sourceIds,
    canceled_onboarding_count: canceledOnboardingCount,
    deleted,
    by_source: bySource,
  };
};
