/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RiskScoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/risk_score_data_client';
import { getAlertsIndex } from '@kbn/security-solution-plugin/common/entity_analytics/utils';

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

type CandidateEntitiesMap = Map<
  string,
  {
    entityId: string;
    entityType: CandidateEntity['entityType'];
    discoveries: EntityDiscovery[];
  }
>;

/**
 * Adds a discovery to the candidate entities map, merging with existing entities if found
 */
const addDiscoveryToMap = (
  map: CandidateEntitiesMap,
  entityId: string,
  entityType: CandidateEntity['entityType'],
  discovery: EntityDiscovery
): void => {
  const existing = map.get(entityId);
  if (existing) {
    existing.discoveries.push(discovery);
  } else {
    map.set(entityId, {
      entityId,
      entityType,
      discoveries: [discovery],
    });
  }
};

/**
 * Processes risk score spikes and adds discoveries to the candidate entities map
 */
const processRiskScoreSpikes = async (
  riskScoreDataClient: RiskScoreDataClient,
  candidateEntitiesMap: CandidateEntitiesMap,
  logger?: Logger
): Promise<void> => {
  try {
    const riskScoreSpikes = await riskScoreDataClient.getRiskScoreSpikes({
      countPerCategory: 25, // Get top 25 spikes per category
    });

    const processSpike = (spike: {
      identifier: string;
      identifierKey: string;
      spike: number;
      baseline: number;
    }) => {
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
        addDiscoveryToMap(candidateEntitiesMap, spike.identifier, entityType, discovery);
      }
    };

    // Process spikes above baseline
    if (riskScoreSpikes.spikesAboveBaseline) {
      for (const spike of riskScoreSpikes.spikesAboveBaseline) {
        processSpike(spike);
      }
    }

    // Process new high score spikes
    if (riskScoreSpikes.newScoreSpikes) {
      for (const spike of riskScoreSpikes.newScoreSpikes) {
        processSpike(spike);
      }
    }

    logger?.debug(
      () => `Found ${candidateEntitiesMap.size} candidate entities from risk score spikes`
    );
  } catch (error) {
    logger?.error(() => `Error fetching risk score spikes: ${error}`);
    throw error;
  }
};

/**
 * Processes a single entity from an alert hit
 */
const processAlertEntity = (
  entityAlertMap: Map<
    string,
    {
      entityId: string;
      entityType: CandidateEntity['entityType'];
      alertCount: number;
      highScoreCount: number;
      maxRiskScore: number;
    }
  >,
  entityName: string,
  entityType: CandidateEntity['entityType'],
  riskScore: number
): void => {
  const existing = entityAlertMap.get(entityName);
  if (existing) {
    existing.alertCount++;
    if (riskScore >= 50) {
      existing.highScoreCount++;
    }
    existing.maxRiskScore = Math.max(existing.maxRiskScore, riskScore);
  } else {
    entityAlertMap.set(entityName, {
      entityId: entityName,
      entityType,
      alertCount: 1,
      highScoreCount: riskScore >= 50 ? 1 : 0,
      maxRiskScore: riskScore,
    });
  }
};

/**
 * Processes high score alerts and adds discoveries to the candidate entities map
 */
const processHighScoreAlerts = async (
  alertsIndex: string,
  esClient: ElasticsearchClient,
  candidateEntitiesMap: CandidateEntitiesMap,
  logger?: Logger
): Promise<void> => {
  try {
    // Query for top 25 most recent alerts sorted by risk score
    const alertsResponse = await esClient.search({
      index: alertsIndex,
      size: 25,
      sort: [
        {
          'kibana.alert.risk_score': {
            order: 'desc',
            missing: '_last',
          },
        },
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
      _source: [
        'user.name',
        'host.name',
        'kibana.alert.risk_score',
        'kibana.alert.rule.name',
        '@timestamp',
      ],
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'kibana.alert.risk_score',
              },
            },
          ],
          should: [
            {
              exists: {
                field: 'user.name',
              },
            },
            {
              exists: {
                field: 'host.name',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });

    if (alertsResponse.hits.hits.length === 0) {
      return;
    }

    // Track entities and their alert counts for aggregation
    const entityAlertMap = new Map<
      string,
      {
        entityId: string;
        entityType: CandidateEntity['entityType'];
        alertCount: number;
        highScoreCount: number;
        maxRiskScore: number;
      }
    >();

    for (const hit of alertsResponse.hits.hits) {
      const source = hit._source as {
        'user.name'?: string | string[];
        'host.name'?: string | string[];
        'kibana.alert.risk_score'?: number;
      };

      const riskScore = source['kibana.alert.risk_score'] ?? 0;

      // Process user entities
      if (source['user.name']) {
        const userName = Array.isArray(source['user.name'])
          ? source['user.name'][0]
          : source['user.name'];
        if (userName) {
          processAlertEntity(entityAlertMap, userName, 'user', riskScore);
        }
      }

      // Process host entities
      if (source['host.name']) {
        const hostName = Array.isArray(source['host.name'])
          ? source['host.name'][0]
          : source['host.name'];
        if (hostName) {
          processAlertEntity(entityAlertMap, hostName, 'host', riskScore);
        }
      }
    }

    // Create discoveries for entities found in alerts
    for (const [entityId, alertData] of entityAlertMap.entries()) {
      const discovery: EntityDiscovery = {
        type: 'high_score_alerts',
        score: alertData.maxRiskScore,
        properties: {
          alertCount: alertData.alertCount,
          highScoreCount: alertData.highScoreCount,
        },
      };
      addDiscoveryToMap(candidateEntitiesMap, entityId, alertData.entityType, discovery);
    }

    logger?.debug(
      () =>
        `Found ${entityAlertMap.size} candidate entities from high score alerts (${alertsResponse.hits.hits.length} alerts processed)`
    );
  } catch (error) {
    logger?.error(() => `Error fetching high score alerts: ${error}`);
    throw error;
  }
};

/**
 * Selects top candidates based on priority scores
 */
const selectTopCandidates = (candidateEntities: CandidateEntity[], logger?: Logger): string[] => {
  if (candidateEntities.length === 0) {
    logger?.debug(() => 'No candidate entities to select from');
    return [];
  }

  // Calculate priority score for each entity
  const entitiesWithScores = candidateEntities.map((entity) => ({
    entity,
    priorityScore: calculatePriorityScore(entity),
  }));

  // Sort by priority score (descending) and select top N
  entitiesWithScores.sort((a, b) => b.priorityScore - a.priorityScore);

  const selectedCandidateIds = entitiesWithScores
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

  return selectedCandidateIds;
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

    const candidateEntitiesMap: CandidateEntitiesMap = new Map();

    // Step 1: Find candidate entities from various discovery methods

    // Discovery method 1: Risk score spikes
    if (riskScoreDataClient) {
      try {
        await processRiskScoreSpikes(riskScoreDataClient, candidateEntitiesMap, logger);
      } catch (error) {
        logger?.error(() => `Error fetching risk score spikes: ${error}`);
        // Continue with other candidate finding methods even if this fails
      }
    } else {
      logger?.debug(
        () => 'Risk score data client not available, skipping risk score spike queries'
      );
    }

    // Discovery method 2: High score alerts
    if (alertsIndexPattern || namespace) {
      try {
        const alertsIndex = alertsIndexPattern || getAlertsIndex(namespace || 'default');
        await processHighScoreAlerts(alertsIndex, esClient, candidateEntitiesMap, logger);
      } catch (error) {
        logger?.error(() => `Error fetching high score alerts: ${error}`);
        // Continue with other candidate finding methods even if this fails
      }
    } else {
      logger?.debug(
        () => 'Alerts index pattern and namespace not available, skipping alert queries'
      );
    }

    // TODO: Implement additional candidate entity finding logic
    // - Query for entities with lots of alerts (high_alert_count discovery type)
    // - Optionally include anomalies

    // Convert map to array of CandidateEntity
    const candidateEntities: CandidateEntity[] = Array.from(candidateEntitiesMap.values());

    logger?.debug(() => `Found ${candidateEntities.length} total candidate entities`);

    // Step 2: Calculate priority scores and select top candidates
    const selectedCandidateIds = selectTopCandidates(candidateEntities, logger);

    return {
      ...state,
      candidateEntities,
      selectedCandidateIds,
    };
  };

  return findAndSelectCandidates;
};
