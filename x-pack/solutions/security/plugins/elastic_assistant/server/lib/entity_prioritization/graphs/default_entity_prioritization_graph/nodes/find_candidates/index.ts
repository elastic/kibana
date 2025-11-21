/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { ThreatHuntingPrioritiesGraphState, CandidateEntity } from '../../../../state';
import type { RiskScoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/risk_score_data_client';

/**
 * Maps a SpikeEntity identifierKey to CandidateEntity entityType
 * Only supports user and host entities
 */
const mapIdentifierKeyToEntityType = (
  identifierKey: string
): CandidateEntity['entityType'] | null => {
  if (identifierKey === 'user.name') {
    return 'user';
  }
  if (identifierKey === 'host.name') {
    return 'host';
  }
  // Skip service.name and other entity types for now
  return null;
};

export const getFindCandidateEntitiesNode = ({
  alertsIndexPattern,
  esClient,
  logger,
  namespace,
  riskScoreDataClient,
  riskScoreIndexPattern,
}: {
  alertsIndexPattern?: string;
  esClient: ElasticsearchClient;
  logger?: Logger;
  namespace?: string;
  riskScoreDataClient?: RiskScoreDataClient;
  riskScoreIndexPattern?: string;
}): ((state: ThreatHuntingPrioritiesGraphState) => Promise<ThreatHuntingPrioritiesGraphState>) => {
  const findCandidateEntities = async (
    state: ThreatHuntingPrioritiesGraphState
  ): Promise<ThreatHuntingPrioritiesGraphState> => {
    logger?.debug(() => '---FIND CANDIDATE ENTITIES---');

    const candidateEntities: CandidateEntity[] = [];

    // Get entities with risk score spikes
    if (riskScoreDataClient) {
      try {
        const riskScoreSpikes = await riskScoreDataClient.getRiskScoreSpikes({
          countPerCategory: 25, // Get top 25 spikes per category
        });

        // Process spikes above baseline
        if (riskScoreSpikes.spikesAboveBaseline) {
          for (const spike of riskScoreSpikes.spikesAboveBaseline) {
            const entityType = mapIdentifierKeyToEntityType(spike.identifierKey);
            if (entityType) {
              candidateEntities.push({
                entityId: spike.identifier,
                entityType,
                riskScore: spike.baseline + spike.spike, // Current score = baseline + spike
                riskScoreSpike: true,
                spike: spike.spike, // Store the spike value
                baseline: spike.baseline, // Store the baseline value
              });
            }
          }
        }

        // Process new high score spikes
        if (riskScoreSpikes.newScoreSpikes) {
          for (const spike of riskScoreSpikes.newScoreSpikes) {
            const entityType = mapIdentifierKeyToEntityType(spike.identifierKey);
            if (entityType) {
              candidateEntities.push({
                entityId: spike.identifier,
                entityType,
                riskScore: spike.spike, // New score is the spike value
                riskScoreSpike: true,
                spike: spike.spike, // Store the spike value (same as riskScore for new spikes)
                baseline: spike.baseline, // Store the baseline value (0 for new spikes)
              });
            }
          }
        }

        logger?.debug(
          () => `Found ${candidateEntities.length} candidate entities from risk score spikes`
        );
      } catch (error) {
        logger?.error(() => `Error fetching risk score spikes: ${error}`);
        // Continue with other candidate finding methods even if this fails
      }
    } else {
      logger?.debug(
        () => 'Risk score data client not available, skipping risk score spike queries'
      );
    }

    // TODO: Implement additional candidate entity finding logic
    // - Query for entities with recently opened high-score alerts
    // - Query for entities with lots of alerts
    // - Optionally include anomalies

    logger?.debug(() => `Found ${candidateEntities.length} total candidate entities`);

    return {
      ...state,
      candidateEntities,
    };
  };

  return findCandidateEntities;
};
