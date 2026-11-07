/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { Entity } from '../../../../common/api/entity_analytics';
import { EntityType } from '../../../../common/entity_analytics/types';

export type IntelligenceTabId =
  | 'overview'
  | 'entities'
  | 'explorer'
  | 'ai_hunt'
  | 'ai_policies'
  | 'use_cases';

export const INTELLIGENCE_TAB_IDS: readonly IntelligenceTabId[] = [
  'overview',
  'entities',
  'explorer',
  'ai_hunt',
  'ai_policies',
  'use_cases',
] as const;

export const isIntelligenceTabId = (value: string | null): value is IntelligenceTabId =>
  value !== null && (INTELLIGENCE_TAB_IDS as readonly string[]).includes(value);

export type RiskLevel = 'Unknown' | 'Low' | 'Moderate' | 'High' | 'Critical';

export const RISK_LEVELS: readonly RiskLevel[] = [
  'Critical',
  'High',
  'Moderate',
  'Low',
  'Unknown',
] as const;

/**
 * Maps a risk level to the EUI severity palette so colors track the active
 * theme (dark/light) instead of hardcoded hex values.
 */
export const getRiskLevelColor = (euiTheme: EuiThemeComputed, level: RiskLevel): string => {
  const { danger, risk, warning, neutral, unknown } = euiTheme.colors.severity;
  switch (level) {
    case 'Critical':
      return danger;
    case 'High':
      return risk;
    case 'Moderate':
      return warning;
    case 'Low':
      return neutral;
    default:
      return unknown;
  }
};

/** Maps a detection alert severity to the EUI severity palette. */
export const getAlertSeverityColor = (
  euiTheme: EuiThemeComputed,
  severity: 'low' | 'medium' | 'high' | 'critical' | undefined
): string => {
  const { danger, risk, warning, neutral, unknown } = euiTheme.colors.severity;
  switch (severity) {
    case 'critical':
      return danger;
    case 'high':
      return risk;
    case 'medium':
      return warning;
    case 'low':
      return neutral;
    default:
      return unknown;
  }
};

export const getRiskLevelFromScore = (scoreNorm: number | undefined): RiskLevel => {
  if (scoreNorm === undefined) return 'Unknown';
  if (scoreNorm >= 90) return 'Critical';
  if (scoreNorm >= 70) return 'High';
  if (scoreNorm >= 40) return 'Moderate';
  if (scoreNorm >= 20) return 'Low';
  return 'Unknown';
};

/** Entity store record fields flattened for rendering in lists. */
export interface IntelligenceEntity {
  id: string;
  name: string;
  type: EntityType;
  /**
   * Raw ECS identifier value (`user.name` / `host.name` / `service.name`) used
   * to correlate against alert/event indices. Falls back to the display name
   * when the record does not carry the raw field.
   */
  identifierValue: string;
  /** Singleton ECS account or resource ID, retained for exact identity attribution. */
  identityId?: string;
  riskScoreNorm: number | undefined;
  riskLevel: RiskLevel;
  criticality: string | undefined;
  source: string | undefined;
  lastSeen: string | undefined;
}

const isKnownEntityType = (value: string | undefined): value is EntityType =>
  value === EntityType.user ||
  value === EntityType.host ||
  value === EntityType.service ||
  value === EntityType.generic;

/**
 * Coerces a polymorphic ECS keyword field (which may be a scalar string, an
 * array of strings, or absent) to a single scalar string. ECS `*.name` fields
 * are inherently multi-valued, so an entity-store record can legitimately carry
 * e.g. `host.name: ["a.local", "a.localdomain"]`; downstream code treats
 * identifiers as strings, so the first value is taken (and non-strings are
 * dropped). Returns undefined when no usable string value exists.
 */
const firstString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value.find((v): v is string => typeof v === 'string');
  return typeof value === 'string' ? value : undefined;
};

/**
 * Normalizes a raw entity store record (`Entity` union) into the flat shape
 * the intelligence page renders. Returns undefined when the record has no id.
 */
export const toIntelligenceEntity = (record: Entity): IntelligenceEntity | undefined => {
  const raw = record as {
    entity?: {
      id?: string;
      name?: string | string[];
      EngineMetadata?: { Type?: string };
      risk?: { calculated_score_norm?: number; calculated_level?: string };
      source?: string[] | string;
    };
    user?: { id?: string | string[]; name?: string | string[] };
    host?: { id?: string | string[]; name?: string | string[] };
    service?: { id?: string | string[]; name?: string | string[] };
    asset?: { criticality?: string | null };
    '@timestamp'?: string;
  };
  const entityField = raw.entity;
  if (!entityField?.id) return undefined;

  const engineType = entityField.EngineMetadata?.Type;
  const type = isKnownEntityType(engineType) ? engineType : EntityType.generic;
  const scoreNorm = entityField.risk?.calculated_score_norm;
  const level = entityField.risk?.calculated_level;
  const source = Array.isArray(entityField.source) ? entityField.source[0] : entityField.source;
  const name = firstString(entityField.name) ?? entityField.id;
  const identifierValue =
    firstString(
      type === EntityType.user
        ? raw.user?.name
        : type === EntityType.host
        ? raw.host?.name
        : type === EntityType.service
        ? raw.service?.name
        : undefined
    ) ?? name;
  const rawIdentityId =
    type === EntityType.user
      ? raw.user?.id
      : type === EntityType.host
      ? raw.host?.id
      : type === EntityType.service
      ? raw.service?.id
      : undefined;
  const identityId = Array.isArray(rawIdentityId)
    ? rawIdentityId.length === 1
      ? rawIdentityId[0]
      : undefined
    : rawIdentityId;

  return {
    id: entityField.id,
    name,
    type,
    identifierValue,
    ...(identityId ? { identityId } : {}),
    riskScoreNorm: scoreNorm,
    riskLevel:
      level === 'Critical' ||
      level === 'High' ||
      level === 'Moderate' ||
      level === 'Low' ||
      level === 'Unknown'
        ? level
        : getRiskLevelFromScore(scoreNorm),
    criticality: raw.asset?.criticality ?? undefined,
    source,
    lastSeen: raw['@timestamp'],
  };
};
