/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RiskScoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/risk_score_data_client';

import type {
  ThreatHuntingPrioritiesGraphState,
  CandidateEntity,
  EntityDiscovery,
} from '../../../../state';

const MAX_SELECTED_CANDIDATES = 10;
const STRONG_SIGNAL_THRESHOLD = 60; // Threshold for considering a signal "strong"
const DIVERSITY_BONUS = 50; // Bonus added when multiple strong signals exist

/**
 * Type guard to check if a discovery is a risk score spike discovery
 */
const isRiskScoreSpikeDiscovery = (
  discovery: EntityDiscovery
): discovery is Extract<EntityDiscovery, { type: 'risk_score_spike' }> => {
  return discovery.type === 'risk_score_spike';
};

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

/**
 * Calculates an importance score (0-100) for a risk score spike discovery
 * Higher scores indicate more significant spikes
 */
const calculateRiskScoreSpikeScore = (spike: number, baseline: number): number => {
  // For new high scores (baseline is 0), score based on absolute value
  // Risk scores typically range from 0-100, so we normalize
  if (baseline === 0) {
    return Math.min(100, Math.round(spike));
  }

  // For spikes above baseline, calculate based on:
  // 1. The magnitude of the spike (spike - baseline)
  // 2. The percentage increase ((spike - baseline) / baseline * 100)
  // Combine both factors, weighted toward percentage increase for low baselines
  const spikeMagnitude = spike - baseline;
  const percentageIncrease = baseline > 0 ? (spikeMagnitude / baseline) * 100 : 0;

  // Weight: 40% magnitude (normalized to 0-100), 60% percentage increase (capped at 100)
  const magnitudeScore = Math.min(100, spikeMagnitude);
  const percentageScore = Math.min(100, percentageIncrease);

  return Math.min(100, Math.round(magnitudeScore * 0.4 + percentageScore * 0.6));
};

/**
 * Gets the feedback modifier for an entity
 * TODO: Implement actual feedback mechanism
 * For now, returns 1.0 (no modification)
 */
const getFeedbackModifier = (_entityId: string): number => {
  // Stub: return 1.0 (no feedback modification)
  // In the future, this will look up user feedback for the entity
  return 1.0;
};

/**
 * Calculates the priority score for a candidate entity based on its discoveries
 * Priority score formula:
 * 1. Start with max of all discovery scores
 * 2. Add diversity bonus (+50) if multiple signals exceed strong threshold (>60)
 * 3. Apply feedback modifier (multiply by feedback modifier)
 */
const calculatePriorityScore = (entity: CandidateEntity): number => {
  if (entity.discoveries.length === 0) {
    return 0;
  }

  // Step 1: Get max of all discovery scores
  const maxScore = Math.max(...entity.discoveries.map((d) => d.score));

  // Step 2: Check for multiple strong signals (scores > STRONG_SIGNAL_THRESHOLD)
  const strongSignals = entity.discoveries.filter((d) => d.score > STRONG_SIGNAL_THRESHOLD);
  const multipleStrongSignals = strongSignals.length > 1;

  let score = maxScore;

  // Add diversity bonus if multiple strong signals exist
  if (multipleStrongSignals) {
    score += DIVERSITY_BONUS;
  }

  // Step 3: Apply feedback modifier
  const feedbackModifier = getFeedbackModifier(entity.entityId);
  score = score * feedbackModifier;

  return Math.round(score);
};

export const getFindAndSelectCandidatesNode = ({
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
  const findAndSelectCandidates = async (
    state: ThreatHuntingPrioritiesGraphState
  ): Promise<ThreatHuntingPrioritiesGraphState> => {
    logger?.debug(() => '---FIND AND SELECT CANDIDATE ENTITIES---');

    const candidateEntitiesMap = new Map<
      string,
      {
        entityId: string;
        entityType: CandidateEntity['entityType'];
        discoveries: EntityDiscovery[];
      }
    >();

    // Step 1: Find candidate entities from various discovery methods

    // Discovery method 1: Risk score spikes
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
              const score = calculateRiskScoreSpikeScore(spike.spike, spike.baseline);
              const discovery: EntityDiscovery = {
                type: 'risk_score_spike',
                score,
                properties: {
                  baseline: spike.baseline,
                  spike: spike.spike,
                  riskScore: spike.spike, // Current score is the spike value
                },
              };

              const existing = candidateEntitiesMap.get(spike.identifier);
              if (existing) {
                existing.discoveries.push(discovery);
              } else {
                candidateEntitiesMap.set(spike.identifier, {
                  entityId: spike.identifier,
                  entityType,
                  discoveries: [discovery],
                });
              }
            }
          }
        }

        // Process new high score spikes
        if (riskScoreSpikes.newScoreSpikes) {
          for (const spike of riskScoreSpikes.newScoreSpikes) {
            const entityType = mapIdentifierKeyToEntityType(spike.identifierKey);
            if (entityType) {
              const score = calculateRiskScoreSpikeScore(spike.spike, spike.baseline);
              const discovery: EntityDiscovery = {
                type: 'risk_score_spike',
                score,
                properties: {
                  baseline: spike.baseline, // 0 for new spikes
                  spike: spike.spike,
                  riskScore: spike.spike, // New score is the spike value
                },
              };

              const existing = candidateEntitiesMap.get(spike.identifier);
              if (existing) {
                existing.discoveries.push(discovery);
              } else {
                candidateEntitiesMap.set(spike.identifier, {
                  entityId: spike.identifier,
                  entityType,
                  discoveries: [discovery],
                });
              }
            }
          }
        }

        logger?.debug(
          () => `Found ${candidateEntitiesMap.size} candidate entities from risk score spikes`
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
    //   Example:
    //   const alertDiscovery: EntityDiscovery = {
    //     type: 'high_score_alerts',
    //     score: calculateAlertScore(...),
    //     properties: {
    //       alertCount: ...,
    //       highScoreCount: ...
    //     }
    //   };
    // - Query for entities with lots of alerts
    //   Example:
    //   const alertCountDiscovery: EntityDiscovery = {
    //     type: 'high_alert_count',
    //     score: calculateAlertCountScore(...),
    //     properties: {
    //       alertCount: ...
    //     }
    //   };
    // - Optionally include anomalies
    //   Example:
    //   const anomalyDiscovery: EntityDiscovery = {
    //     type: 'anomaly',
    //     score: calculateAnomalyScore(...),
    //     properties: {
    //       anomalyType: ...,
    //       severity: ...
    //     }
    //   };

    // Convert map to array of CandidateEntity
    const candidateEntities: CandidateEntity[] = Array.from(candidateEntitiesMap.values());

    logger?.debug(() => `Found ${candidateEntities.length} total candidate entities`);

    // Step 2: Calculate priority scores and select top candidates
    let selectedCandidateIds: string[] = [];

    if (candidateEntities.length === 0) {
      logger?.debug(() => 'No candidate entities to select from');
      return {
        ...state,
        candidateEntities,
        selectedCandidateIds,
      };
    }

    // Calculate priority score for each entity
    const entitiesWithScores = candidateEntities.map((entity) => ({
      entity,
      priorityScore: calculatePriorityScore(entity),
    }));

    // Sort by priority score (descending) and select top N
    entitiesWithScores.sort((a, b) => b.priorityScore - a.priorityScore);

    selectedCandidateIds = entitiesWithScores
      .slice(0, MAX_SELECTED_CANDIDATES)
      .map(({ entity }) => entity.entityId);

    logger?.debug(
      () =>
        `Selected ${
          selectedCandidateIds.length
        } candidates based on priority scores: ${selectedCandidateIds
          .map(
            (id) =>
              `${id} (score: ${
                entitiesWithScores.find((e) => e.entity.entityId === id)?.priorityScore ?? 0
              })`
          )
          .join(', ')}`
    );

    return {
      ...state,
      candidateEntities,
      selectedCandidateIds,
    };
  };

  return findAndSelectCandidates;
};
