/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadEntity, ObservationSeverity } from '../../types';
import { entityTypeLabel } from '../utils';

export const MODULE_ID = 'behavioral_analysis';
export const MODULE_NAME = 'Behavioral Analysis';
export const MODULE_PRIORITY = 8;

export const MULTI_TACTIC_RULE_THRESHOLD = 3;
export const HIGH_VOLUME_ALERT_THRESHOLD = 10;
export const ALERT_LOOKBACK = 'now-7d';

export const ALERT_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export interface AlertSummary {
  readonly totalAlerts: number;
  readonly severityCounts: Record<string, number>;
  readonly distinctRuleNames: string[];
  readonly maxRiskScore: number;
  readonly topAlerts: Array<{
    readonly id: string;
    readonly severity: string;
    readonly ruleName: string;
    readonly riskScore: number;
    readonly timestamp: string;
  }>;
}

export interface AlertSeverityTier {
  getCount(counts: Record<string, number>): number;
  getSeverity(counts: Record<string, number>): ObservationSeverity;
  readonly type: string;
  readonly confidence: number;
  getScore(count: number, summary: AlertSummary): number;
  getDescription(entity: LeadEntity, count: number, counts: Record<string, number>): string;
  readonly includeRuleNames: boolean;
}

/**
 * Ordered highest → lowest. `collect()` uses `find()` so only the most severe
 * tier fires per entity.
 */
export const ALERT_SEVERITY_TIERS: readonly AlertSeverityTier[] = [
  {
    type: 'high_severity_alerts',
    confidence: 0.9,
    includeRuleNames: false,
    getCount: (c) => (c.critical ?? 0) + (c.high ?? 0),
    getSeverity: (c) => ((c.critical ?? 0) > 0 ? 'critical' : 'high'),
    getScore: (_count, s) => Math.min(100, s.maxRiskScore),
    getDescription: (entity, _count, c) =>
      `${entityTypeLabel(entity)} ${entity.name} has ${c.critical ?? 0} critical and ${
        c.high ?? 0
      } high severity alerts in the last 7 days`,
  },
  {
    type: 'medium_severity_alerts',
    confidence: 0.7,
    includeRuleNames: true,
    getCount: (c) => c.medium ?? 0,
    getSeverity: () => 'medium',
    getScore: (count) => Math.min(100, count * 15),
    getDescription: (entity, count) =>
      `${entityTypeLabel(entity)} ${
        entity.name
      } has ${count} medium severity alerts in the last 7 days`,
  },
  {
    type: 'low_severity_alerts',
    confidence: 0.5,
    includeRuleNames: true,
    getCount: (c) => c.low ?? 0,
    getSeverity: () => 'low',
    getScore: (count) => Math.min(100, count * 10),
    getDescription: (entity, count) =>
      `${entityTypeLabel(entity)} ${
        entity.name
      } has ${count} low severity alerts in the last 7 days`,
  },
] as const;
