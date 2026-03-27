/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';
import { makeObservation, getEntityField, groupEntitiesByType } from './utils';

const MODULE_ID = 'risk_analysis';
const MODULE_NAME = 'Risk Analysis';
const MODULE_PRIORITY = 10;

const HIGH_RISK_THRESHOLD = 70;
const ESCALATION_DELTA_24H = 10;
const ESCALATION_DELTA_7D_90D = 20;
/** At or above this delta, the escalation severity bumps up one tier */
const ESCALATION_CRITICAL_DELTA = 40;

/**
 * Uses the risk engine's authoritative calculated_level directly instead of
 * re-deriving tiers from score thresholds. "Low" is intentionally omitted —
 * a low-risk entity on its own is not an actionable lead signal.
 */
const RISK_LEVEL_TO_SEVERITY: Readonly<Record<string, ObservationSeverity>> = {
  Critical: 'critical',
  High: 'high',
  Moderate: 'medium',
};

const RISK_LEVEL_TO_TYPE: Readonly<Record<string, string>> = {
  Critical: 'high_risk_score',
  High: 'high_risk_score',
  Moderate: 'moderate_risk_score',
};

const RISK_LEVEL_CONFIDENCE: Readonly<Record<string, number>> = {
  Critical: 0.95,
  High: 0.95,
  Moderate: 0.8,
};

interface EscalationWindow {
  readonly daysBack: number;
  readonly threshold: number;
  readonly type: string;
  readonly baseSeverity: ObservationSeverity;
  readonly criticalSeverity: ObservationSeverity;
  readonly label: string;
}

const ESCALATION_WINDOWS: readonly EscalationWindow[] = [
  {
    daysBack: 1,
    threshold: ESCALATION_DELTA_24H,
    type: 'risk_escalation_24h',
    baseSeverity: 'critical',
    criticalSeverity: 'critical',
    label: '24 hours',
  },
  {
    daysBack: 7,
    threshold: ESCALATION_DELTA_7D_90D,
    type: 'risk_escalation_7d',
    baseSeverity: 'high',
    criticalSeverity: 'critical',
    label: '7 days',
  },
  {
    daysBack: 90,
    threshold: ESCALATION_DELTA_7D_90D,
    type: 'risk_escalation_90d',
    baseSeverity: 'medium',
    criticalSeverity: 'high',
    label: '90 days',
  },
] as const;

interface RiskScoreModuleDeps {
  readonly riskScoreDataClient: RiskScoreDataClient;
  readonly logger: Logger;
}

export const createRiskScoreModule = ({
  riskScoreDataClient,
  logger,
}: RiskScoreModuleDeps): ObservationModule => ({
  config: { id: MODULE_ID, name: MODULE_NAME, priority: MODULE_PRIORITY },

  isEnabled: () => true,

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const timeSeriesScores = await fetchTimeSeriesRiskScores(riskScoreDataClient, entities, logger);
    const observations: Observation[] = [];

    for (const entity of entities) {
      const internals = extractEntityInternals(entity);
      if (internals) {
        const { scoreNorm, level, isPrivileged } = internals;
        const historicalScores = timeSeriesScores.get(`${entity.type}:${entity.name}`) ?? [];

        const severity = RISK_LEVEL_TO_SEVERITY[level];
        const observationType = RISK_LEVEL_TO_TYPE[level];
        if (severity && observationType) {
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: observationType,
              score: scoreNorm,
              severity,
              confidence: RISK_LEVEL_CONFIDENCE[level] ?? 0.8,
              description: `Entity ${entity.name} has a ${level} risk score of ${scoreNorm.toFixed(
                1
              )}`,
              metadata: {
                calculated_score_norm: scoreNorm,
                calculated_level: level,
                entity_type: entity.type,
              },
            })
          );
        }

        for (const w of ESCALATION_WINDOWS) {
          const esc = detectEscalation(scoreNorm, historicalScores, w.daysBack, w.threshold);
          if (esc) {
            const escalationSeverity =
              esc.delta >= ESCALATION_CRITICAL_DELTA ? w.criticalSeverity : w.baseSeverity;
            observations.push(
              makeObservation(entity, MODULE_ID, {
                type: w.type,
                score: Math.min(100, esc.delta * 2),
                severity: escalationSeverity,
                confidence: 0.85,
                description: `Entity ${entity.name} risk score escalated by ${esc.delta.toFixed(
                  1
                )} points (from ${esc.previousScore.toFixed(1)} to ${scoreNorm.toFixed(
                  1
                )}) in the last ${w.label}`,
                metadata: {
                  current_score: scoreNorm,
                  previous_score: esc.previousScore,
                  delta: esc.delta,
                  entity_type: entity.type,
                  window: w.label,
                },
              })
            );
          }
        }

        if (isPrivileged && scoreNorm >= HIGH_RISK_THRESHOLD) {
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: 'privileged_high_risk',
              score: Math.min(100, scoreNorm * 1.2),
              severity: 'critical',
              confidence: 0.95,
              description: `Privileged entity ${
                entity.name
              } has a ${level} risk score of ${scoreNorm.toFixed(
                1
              )} — elevated concern due to privileged access`,
              metadata: {
                calculated_score_norm: scoreNorm,
                calculated_level: level,
                entity_type: entity.type,
                is_privileged: true,
              },
            })
          );
        }
      }
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

interface EntityInternals {
  readonly scoreNorm: number;
  readonly level: string;
  readonly isPrivileged: boolean;
}

const extractEntityInternals = (entity: LeadEntity): EntityInternals | undefined => {
  const entityField = getEntityField(entity);
  if (!entityField) return undefined;

  const risk = entityField.risk as
    | { calculated_score_norm?: unknown; calculated_level?: string }
    | undefined;
  if (risk?.calculated_score_norm == null) return undefined;

  const scoreNorm = Number(risk.calculated_score_norm);
  if (Number.isNaN(scoreNorm)) return undefined;

  const attributes = entityField.attributes as { privileged?: boolean } | undefined;
  return {
    scoreNorm,
    level: risk.calculated_level ?? 'Unknown',
    isPrivileged: attributes?.privileged === true,
  };
};

const fetchTimeSeriesRiskScores = async (
  riskScoreDataClient: RiskScoreDataClient,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, number[]>> => {
  const result = new Map<string, number[]>();

  for (const [entityType, group] of groupEntitiesByType(entities).entries()) {
    const names = group.map((e) => e.name);
    try {
      const batch = await riskScoreDataClient.getDailyAverageRiskScoreNormSeries({
        entityType,
        entityNames: names,
      });
      for (const [key, scores] of batch.entries()) {
        result.set(key, scores);
      }
    } catch (error) {
      logger.warn(
        `[${MODULE_ID}] Failed to fetch time-series risk scores for ${entityType}: ${error}`
      );
    }
  }

  return result;
};

interface EscalationInfo {
  readonly delta: number;
  readonly previousScore: number;
}

/**
 * `dailyScores` is ordered oldest → newest (one value per calendar day bucket).
 * Compare current score to the bucket `daysBack` positions before the latest bucket
 * so we do not compare "today" to "today" (which would hide 24h escalations).
 */
const detectEscalation = (
  currentScore: number,
  dailyScores: number[],
  daysBack: number,
  deltaThreshold: number
): EscalationInfo | undefined => {
  if (dailyScores.length < daysBack + 1) return undefined;
  const previousScore = dailyScores[dailyScores.length - 1 - daysBack];
  if (previousScore == null || Number.isNaN(previousScore)) return undefined;
  const delta = currentScore - previousScore;
  return delta >= deltaThreshold ? { delta, previousScore } : undefined;
};
