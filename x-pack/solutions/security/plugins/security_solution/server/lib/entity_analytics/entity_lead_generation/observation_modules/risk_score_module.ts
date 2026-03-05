/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_ID = 'risk_analysis';
const MODULE_NAME = 'Risk Analysis';
const MODULE_PRIORITY = 10;
const MODULE_WEIGHT = 0.35;

const LOW_RISK_THRESHOLD = 20;
const MODERATE_RISK_THRESHOLD = 40;
const HIGH_RISK_THRESHOLD = 70;
const CRITICAL_RISK_THRESHOLD = 90;
/** Delta threshold for 7d/90d escalation (points) */
const ESCALATION_DELTA_7D_90D = 20;
/** Delta threshold for 24h escalation (points) — significant short-term spike */
const ESCALATION_DELTA_24H = 10;
/** Delta >= 40 over 7d yields critical severity */
const ESCALATION_CRITICAL_7D = 40;

// ---------------------------------------------------------------------------
// Risk Score Analysis Module
//
// Entity Store V2 records already embed risk data in entity.risk:
//   - calculated_score_norm (0-100)
//   - calculated_score (raw)
//   - calculated_level ('Low' | 'Moderate' | 'High' | 'Critical' | 'Unknown')
//
// This module reads risk data directly from the entity records passed in,
// rather than querying a separate risk score index.
//
// For escalation detection, we still need to query the time-series risk
// score index to compare the current score against historical values.
// ---------------------------------------------------------------------------

interface RiskScoreModuleDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

export const createRiskScoreModule = ({
  esClient,
  logger,
  spaceId,
}: RiskScoreModuleDeps): ObservationModule => {
  return {
    config: {
      id: MODULE_ID,
      name: MODULE_NAME,
      priority: MODULE_PRIORITY,
      weight: MODULE_WEIGHT,
    },

    isEnabled(): boolean {
      return true;
    },

    async collect(entities: LeadEntity[]): Promise<Observation[]> {
      const observations: Observation[] = [];

      // Batch fetch time-series risk scores for escalation detection only.
      // Current risk scores come from the entity records themselves.
      const timeSeriesScoresByEntity = await fetchTimeSeriesRiskScores(
        esClient,
        spaceId,
        entities,
        logger
      );

      for (const entity of entities) {
        const entityKey = entityToKey(entity);

        // Read risk data directly from the Entity Store V2 record
        const riskData = extractRiskData(entity);

        if (riskData) {
          const { scoreNorm, level } = riskData;

          // Observation 1: Risk level flag (tiered)
          if (scoreNorm >= HIGH_RISK_THRESHOLD) {
            observations.push(buildHighRiskObservation(entity, scoreNorm, level));
          } else if (scoreNorm >= MODERATE_RISK_THRESHOLD) {
            observations.push(buildModerateRiskObservation(entity, scoreNorm, level));
          } else if (scoreNorm >= LOW_RISK_THRESHOLD) {
            observations.push(buildLowRiskObservation(entity, scoreNorm, level));
          }

          // Observation 2: Risk escalation over 24h, 7d, 90d (requires historical comparison)
          const historicalScores = timeSeriesScoresByEntity.get(entityKey) ?? [];
          const escalation24h = detectEscalationInWindow(
            scoreNorm,
            historicalScores,
            1,
            ESCALATION_DELTA_24H
          );
          if (escalation24h) {
            observations.push(
              buildEscalationObservation(
                entity,
                scoreNorm,
                escalation24h,
                'risk_escalation_24h',
                'critical',
                '24 hours'
              )
            );
          }

          const escalation7d = detectEscalationInWindow(
            scoreNorm,
            historicalScores,
            7,
            ESCALATION_DELTA_7D_90D
          );
          if (escalation7d) {
            const severity: ObservationSeverity =
              escalation7d.delta >= ESCALATION_CRITICAL_7D ? 'critical' : 'high';
            observations.push(
              buildEscalationObservation(
                entity,
                scoreNorm,
                escalation7d,
                'risk_escalation_7d',
                severity,
                '7 days'
              )
            );
          }

          const escalation90d = detectEscalationInWindow(
            scoreNorm,
            historicalScores,
            90,
            ESCALATION_DELTA_7D_90D
          );
          if (escalation90d) {
            const severity: ObservationSeverity =
              escalation90d.delta >= ESCALATION_CRITICAL_7D ? 'high' : 'medium';
            observations.push(
              buildEscalationObservation(
                entity,
                scoreNorm,
                escalation90d,
                'risk_escalation_90d',
                severity,
                '90 days'
              )
            );
          }

          // Observation 3: Privileged entity with elevated risk
          const isPrivileged = extractIsPrivileged(entity);
          if (isPrivileged && scoreNorm >= HIGH_RISK_THRESHOLD) {
            observations.push(buildPrivilegedHighRiskObservation(entity, scoreNorm, level));
          }
        }
      }

      logger.debug(
        `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
      );

      return observations;
    },
  };
};

// ---------------------------------------------------------------------------
// Entity record accessors
//
// Entity Store V2 records are typed as a union (UserEntity | HostEntity |
// ServiceEntity | GenericEntity). The risk data and attributes live under the
// nested `entity` field which is common across all entity types.
// ---------------------------------------------------------------------------

interface ExtractedRisk {
  readonly scoreNorm: number;
  readonly level: string;
}

const extractRiskData = (entity: LeadEntity): ExtractedRisk | undefined => {
  const record = entity.record as Record<string, unknown>;

  // Entity Store V2 places risk data at entity.risk
  const entityField = record.entity as Record<string, unknown> | undefined;
  if (!entityField) {
    return undefined;
  }

  const risk = entityField.risk as
    | { calculated_score_norm?: unknown; calculated_level?: string }
    | undefined;
  if (risk?.calculated_score_norm == null) {
    return undefined;
  }

  const scoreNorm = Number(risk.calculated_score_norm);
  if (Number.isNaN(scoreNorm)) {
    return undefined;
  }

  return {
    scoreNorm,
    level: risk.calculated_level ?? 'Unknown',
  };
};

const extractIsPrivileged = (entity: LeadEntity): boolean => {
  const record = entity.record as Record<string, unknown>;
  const entityField = record.entity as Record<string, unknown> | undefined;
  if (!entityField) {
    return false;
  }

  const attributes = entityField.attributes as { privileged?: boolean } | undefined;
  return attributes?.privileged === true;
};

// ---------------------------------------------------------------------------
// Time-series risk score fetching (for escalation detection)
//
// Current risk scores come from the entity record. To detect escalation
// we still need historical data from the risk score time-series index.
// ---------------------------------------------------------------------------

/**
 * Fetches daily average risk scores for the last 90 days per entity.
 * Buckets are ordered oldest to newest so 24h/7d/90d escalation can be derived by window.
 */
const fetchTimeSeriesRiskScores = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, number[]>> => {
  const result = new Map<string, number[]>();
  const entitiesByType = groupEntitiesByType(entities);

  for (const [entityType, entityGroup] of entitiesByType.entries()) {
    const names = entityGroup.map((e) => e.name);

    try {
      const response = await esClient.search({
        index: `risk-score.risk-score-${spaceId}`,
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { [`${entityType}.name`]: names } },
              { range: { '@timestamp': { gte: 'now-90d', lte: 'now' } } },
            ],
          },
        },
        aggs: {
          by_entity: {
            terms: { field: `${entityType}.name`, size: names.length },
            aggs: {
              scores_over_time: {
                date_histogram: {
                  field: '@timestamp',
                  calendar_interval: 'day',
                },
                aggs: {
                  avg_score: {
                    avg: { field: `${entityType}.risk.calculated_score_norm` },
                  },
                },
              },
            },
          },
        },
      });

      const byEntityAgg = (response.aggregations?.by_entity as Record<string, unknown>) ?? {};
      const buckets = (byEntityAgg.buckets ?? []) as Array<{
        key: string;
        scores_over_time: { buckets: Array<{ avg_score: { value: number | null } }> };
      }>;

      for (const bucket of buckets) {
        const scores = bucket.scores_over_time.buckets
          .map((b) => b.avg_score.value)
          .filter((v): v is number => v != null);
        result.set(`${entityType}:${bucket.key}`, scores);
      }
    } catch (error) {
      logger.warn(
        `[${MODULE_ID}] Failed to fetch time-series risk scores for ${entityType}: ${error}`
      );
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// Observation builders
// ---------------------------------------------------------------------------

const buildHighRiskObservation = (
  entity: LeadEntity,
  scoreNorm: number,
  level: string
): Observation => {
  const severity: ObservationSeverity = scoreNorm >= CRITICAL_RISK_THRESHOLD ? 'critical' : 'high';

  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'high_risk_score',
    score: scoreNorm,
    severity,
    confidence: 0.95,
    description: `Entity ${entity.name} has a ${level} risk score of ${scoreNorm.toFixed(1)}`,
    metadata: {
      calculated_score_norm: scoreNorm,
      calculated_level: level,
      entity_type: entity.type,
    },
  };
};

interface EscalationInfo {
  readonly delta: number;
  readonly previousScore: number;
}

const buildEscalationObservation = (
  entity: LeadEntity,
  currentScore: number,
  escalation: EscalationInfo,
  type: string,
  severity: ObservationSeverity,
  windowLabel: string
): Observation => ({
  entityId: entityToKey(entity),
  moduleId: MODULE_ID,
  type,
  score: Math.min(100, escalation.delta * 2),
  severity,
  confidence: 0.85,
  description: `Entity ${entity.name} risk score escalated by ${escalation.delta.toFixed(
    1
  )} points (from ${escalation.previousScore.toFixed(1)} to ${currentScore.toFixed(
    1
  )}) in the last ${windowLabel}`,
  metadata: {
    current_score: currentScore,
    previous_score: escalation.previousScore,
    delta: escalation.delta,
    entity_type: entity.type,
    window: windowLabel,
  },
});

const buildModerateRiskObservation = (
  entity: LeadEntity,
  scoreNorm: number,
  level: string
): Observation => {
  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'moderate_risk_score',
    score: scoreNorm,
    severity: 'medium',
    confidence: 0.8,
    description: `Entity ${entity.name} has a ${level} risk score of ${scoreNorm.toFixed(
      1
    )}, warranting monitoring`,
    metadata: {
      calculated_score_norm: scoreNorm,
      calculated_level: level,
      entity_type: entity.type,
    },
  };
};

const buildLowRiskObservation = (
  entity: LeadEntity,
  scoreNorm: number,
  level: string
): Observation => {
  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'low_risk_score',
    score: scoreNorm,
    severity: 'low',
    confidence: 0.6,
    description: `Entity ${entity.name} has a ${level} risk score of ${scoreNorm.toFixed(1)}`,
    metadata: {
      calculated_score_norm: scoreNorm,
      calculated_level: level,
      entity_type: entity.type,
    },
  };
};

const buildPrivilegedHighRiskObservation = (
  entity: LeadEntity,
  scoreNorm: number,
  level: string
): Observation => {
  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'privileged_high_risk',
    score: Math.min(100, scoreNorm * 1.2),
    severity: 'critical',
    confidence: 0.95,
    description: `Privileged entity ${entity.name} has a ${level} risk score of ${scoreNorm.toFixed(
      1
    )} - elevated concern due to privileged access`,
    metadata: {
      calculated_score_norm: scoreNorm,
      calculated_level: level,
      entity_type: entity.type,
      is_privileged: true,
    },
  };
};

// ---------------------------------------------------------------------------
// Utility helpers
//
// dailyScores: oldest to newest (from date_histogram). For 24h we use the last
// bucket as baseline; for 7d the bucket 7 days ago; for 90d the oldest bucket.
// ---------------------------------------------------------------------------

/**
 * @param baselineOffsetFromEnd 1 = last bucket (24h), 7 = 7 days ago, 0 = use oldest (90d)
 */
const detectEscalationInWindow = (
  currentScore: number,
  dailyScores: number[],
  baselineOffsetFromEnd: number,
  deltaThreshold: number
): EscalationInfo | undefined => {
  const need = baselineOffsetFromEnd === 0 ? 2 : baselineOffsetFromEnd;
  if (dailyScores.length < need) {
    return undefined;
  }

  const previousScore =
    baselineOffsetFromEnd === 0
      ? dailyScores[0]
      : dailyScores[dailyScores.length - baselineOffsetFromEnd];
  if (previousScore == null || Number.isNaN(previousScore)) {
    return undefined;
  }

  const delta = currentScore - previousScore;
  if (delta >= deltaThreshold) {
    return { delta, previousScore };
  }
  return undefined;
};

const entityToKey = (entity: LeadEntity): string => `${entity.type}:${entity.name}`;

const groupEntitiesByType = (entities: LeadEntity[]): Map<string, LeadEntity[]> => {
  const grouped = new Map<string, LeadEntity[]>();
  for (const entity of entities) {
    const existing = grouped.get(entity.type) ?? [];
    existing.push(entity);
    grouped.set(entity.type, existing);
  }
  return grouped;
};
