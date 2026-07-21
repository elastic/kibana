/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreInput, RiskScoreModifier } from '../../../../common/api/entity_analytics';
import type { EntityRiskScore, RiskStats } from '../../../../common/search_strategy';

/**
 * Local-dev / design-prototype helper: history docs often lack contribution
 * payloads (maintainer resets, daily seed without inputs). When the left flyout
 * would otherwise show empty Alerts / Context tables, synthesize a plausible
 * breakdown that sums toward the known `calculated_score_norm`.
 *
 * Real risk scores are alert-based (criticality/watchlists are Bayesian
 * modifiers). Mocked data therefore always includes a non-zero alerts
 * contribution whenever `calculated_score_norm` > 0.
 */
export const withMockedRiskContributions = <T extends EntityType>(
  entityType: T,
  riskScore: EntityRiskScore<T> | undefined
): EntityRiskScore<T> | undefined => {
  if (!riskScore) {
    return undefined;
  }

  const risk = riskScore[entityType]?.risk;
  if (!risk) {
    return riskScore;
  }

  const total = risk.calculated_score_norm ?? 0;
  if (total <= 0) {
    return riskScore;
  }

  const hasInputs = (risk.inputs?.length ?? 0) > 0;
  const hasModifiers = (risk.modifiers?.length ?? 0) > 0;
  const hasCategoryScore = (risk.category_1_score ?? 0) > 0;

  // Already a complete, engine-realistic payload.
  if (hasInputs && hasModifiers && hasCategoryScore) {
    return riskScore;
  }

  const mocked = buildMockRiskStats(risk, total);

  return {
    ...riskScore,
    [entityType]: {
      ...riskScore[entityType],
      risk: mocked,
    },
  } as EntityRiskScore<T>;
};

const buildMockRiskStats = (risk: RiskStats, total: number): RiskStats => {
  const existingModifiers = risk.modifiers ?? [];
  const existingCriticality = existingModifiers.find((mod) => mod.type === 'asset_criticality');
  const existingWatchlists = existingModifiers.filter((mod) => mod.type === 'watchlist');
  const inventDefaultModifiers = existingModifiers.length === 0;

  const assetCriticalityContribution = inventDefaultModifiers
    ? Math.min(8, Math.round(total * 0.08 * 100) / 100)
    : existingCriticality?.contribution ?? 0;
  const watchlistContribution = inventDefaultModifiers
    ? Math.min(5, Math.round(total * 0.05 * 100) / 100)
    : existingWatchlists.reduce((sum, mod) => sum + (mod.contribution ?? 0), 0);

  // Alerts must always carry the remaining (majority) score when total > 0.
  const alertsScore = Math.max(
    0.01,
    Math.round((total - assetCriticalityContribution - watchlistContribution) * 100) / 100
  );

  const inputs: RiskScoreInput[] = risk.inputs?.length
    ? risk.inputs
    : buildMockAlertInputs(alertsScore, risk['@timestamp']);

  const modifiers: RiskScoreModifier[] = inventDefaultModifiers
    ? [
        {
          type: 'asset_criticality',
          contribution: assetCriticalityContribution,
          metadata: { criticality_level: 'high_impact' },
        },
        {
          type: 'watchlist',
          contribution: watchlistContribution,
          metadata: {
            watchlist_id: 'mock-watchlist-privileged',
            is_privileged_user: true,
            watchlist_name: 'Privileged Users',
          },
        },
      ]
    : existingModifiers;

  return {
    ...risk,
    // Prefer an existing positive alerts score; otherwise fill from the remainder.
    category_1_score:
      risk.category_1_score && risk.category_1_score > 0 ? risk.category_1_score : alertsScore,
    category_1_count:
      risk.category_1_count && risk.category_1_count > 0
        ? risk.category_1_count
        : Math.max(inputs.length, MOCK_ALERT_TOTAL_COUNT),
    category_2_score: risk.category_2_score ?? assetCriticalityContribution,
    inputs,
    modifiers,
  };
};

const MOCK_ALERT_RULES = [
  'Suspicious Login Spike',
  'Unusual Process Execution',
  'Malware Prevention Alert',
  'Brute Force Detection',
  'Lateral Movement Detected',
  'Credential Access Attempt',
  'Persistence via Scheduled Task',
  'Defense Evasion Technique',
  'Command and Control Beacon',
  'Data Exfiltration Pattern',
  'Privilege Escalation Attempt',
  'Suspicious Network Connection',
];

/** Enough mock alerts to exercise the top-10 table + “N more alerts” footer. */
const MOCK_ALERT_INPUT_COUNT = 12;
const MOCK_ALERT_TOTAL_COUNT = 15;

const buildMockAlertInputs = (alertsScore: number, timestamp: string): RiskScoreInput[] => {
  // Descending contributions so the table order is obvious in the prototype.
  const weights = Array.from({ length: MOCK_ALERT_INPUT_COUNT }, (_, i) => MOCK_ALERT_INPUT_COUNT - i);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  return weights.map((weight, i) => {
    const contribution = Math.round((alertsScore * weight) / weightSum * 100) / 100;
    return {
      id: `mock-risk-alert-${i + 1}`,
      index: '.internal.alerts-security.alerts-default-000001',
      category: 'category_1',
      description: `Generated from Detection Engine Rule: ${MOCK_ALERT_RULES[i % MOCK_ALERT_RULES.length]}`,
      risk_score: Math.min(100, 95 - i * 5),
      contribution_score: contribution,
      timestamp,
    };
  });
};
