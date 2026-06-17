/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadEntity, Observation } from '../../types';
import { makeObservation, entityTypeLabel } from '../utils';
import {
  MODULE_ID,
  ALERT_SEVERITY_TIERS,
  HIGH_VOLUME_ALERT_THRESHOLD,
  MULTI_TACTIC_RULE_THRESHOLD,
  type AlertSummary,
} from './config';

export const buildObservationsForEntity = (
  entity: LeadEntity,
  summary: AlertSummary
): Observation[] => {
  const observations: Observation[] = [];
  const { severityCounts, totalAlerts, distinctRuleNames } = summary;

  const tier = ALERT_SEVERITY_TIERS.find((t) => t.getCount(severityCounts) > 0);
  if (tier) {
    const count = tier.getCount(severityCounts);
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: tier.type,
        score: tier.getScore(count, summary),
        severity: tier.getSeverity(severityCounts),
        confidence: tier.confidence,
        description: tier.getDescription(entity, count, severityCounts),
        metadata: {
          severity_counts: severityCounts,
          total_alerts: totalAlerts,
          max_risk_score: summary.maxRiskScore,
          top_alerts: summary.topAlerts,
          ...(tier.includeRuleNames ? { rule_names: distinctRuleNames } : {}),
        },
      })
    );
  }

  if (totalAlerts >= HIGH_VOLUME_ALERT_THRESHOLD) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'alert_volume_spike',
        score: Math.min(100, (totalAlerts / HIGH_VOLUME_ALERT_THRESHOLD) * 60),
        severity: totalAlerts >= HIGH_VOLUME_ALERT_THRESHOLD * 3 ? 'high' : 'medium',
        confidence: 0.8,
        description: `${entityTypeLabel(entity)} ${
          entity.name
        } has ${totalAlerts} alerts in the last 7 days, suggesting elevated threat activity`,
        metadata: { total_alerts: totalAlerts, distinct_rules: distinctRuleNames.length },
      })
    );
  }

  if (distinctRuleNames.length >= MULTI_TACTIC_RULE_THRESHOLD) {
    const ruleCount = distinctRuleNames.length;
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'multi_tactic_attack',
        score: Math.min(100, ruleCount * 20),
        severity: ruleCount >= MULTI_TACTIC_RULE_THRESHOLD * 2 ? 'critical' : 'high',
        confidence: 0.75,
        description: `${entityTypeLabel(entity)} ${
          entity.name
        } is targeted by ${ruleCount} distinct detection rules, indicating a potential multi-tactic attack`,
        metadata: {
          distinct_rule_count: ruleCount,
          rule_names: distinctRuleNames,
          total_alerts: totalAlerts,
        },
      })
    );
  }

  return observations;
};
