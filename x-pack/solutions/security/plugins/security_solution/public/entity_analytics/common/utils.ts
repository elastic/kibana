/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme'; // eslint-disable-line @elastic/eui/no-restricted-eui-imports
import { RiskSeverity } from '../../../common/search_strategy';
import type { SeverityCount } from '../components/severity/types';
export { RISK_LEVEL_RANGES as RISK_SCORE_RANGES } from '../../../common/entity_analytics/risk_engine';

export const SEVERITY_UI_SORT_ORDER = [
  RiskSeverity.Unknown,
  RiskSeverity.Low,
  RiskSeverity.Moderate,
  RiskSeverity.High,
  RiskSeverity.Critical,
];

/*
 * Map Risk severity to EUI severity color pattern as per spec:
 * https://eui.elastic.co/docs/patterns/severity/index.html#use-cases
 */
export const RISK_SEVERITY_COLOUR = {
  [RiskSeverity.Unknown]: euiThemeVars.euiColorSeverityUnknown,
  [RiskSeverity.Low]: euiThemeVars.euiColorSeverityNeutral,
  [RiskSeverity.Moderate]: euiThemeVars.euiColorSeverityWarning,
  [RiskSeverity.High]: euiThemeVars.euiColorSeverityRisk,
  [RiskSeverity.Critical]: euiThemeVars.euiColorSeverityDanger,
};

type SnakeToCamelCaseString<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCaseString<U>>}`
  : S;

type SnakeToCamelCaseArray<T> = T extends Array<infer ArrayItem>
  ? Array<SnakeToCamelCase<ArrayItem>>
  : T;

// TODO #173073 @tiansivive Add to utilities in `src/platform/packages/shared/kbn-utility-types`
export type SnakeToCamelCase<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T as SnakeToCamelCaseString<K & string>]: SnakeToCamelCase<T[K]>;
    }
  : T extends unknown[]
  ? SnakeToCamelCaseArray<T>
  : T;

export enum UserRiskScoreQueryId {
  USERS_BY_RISK = 'UsersByRisk',
  USER_DETAILS_RISK_SCORE = 'UserDetailsRiskScore',
}

export enum HostRiskScoreQueryId {
  DEFAULT = 'HostRiskScore',
  HOST_DETAILS_RISK_SCORE = 'HostDetailsRiskScore',
  OVERVIEW_RISKY_HOSTS = 'OverviewRiskyHosts',
  HOSTS_BY_RISK = 'HostsByRisk',
}

/**
 *
 * @returns risk score rounded with 2 digits after the decimal separator
 * @example
 * formatRiskScore(10.555) // '10.56'
 */
export const formatRiskScore = (riskScore: number) =>
  (Math.round(riskScore * 100) / 100).toFixed(2);

export const formatRiskScoreWholeNumber = (riskScore: number) =>
  (Math.round(riskScore * 100) / 100).toFixed(0);

export const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

/**
 * Extracts a human-readable message from Kibana HTTP response errors,
 * which nest the message under `error.body.message`.
 */
export function safeErrorMessage(error: unknown, fallback: string): string;
export function safeErrorMessage(error: unknown): string | undefined;
export function safeErrorMessage(error: unknown, fallback?: string): string | undefined {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body?: { message?: string } }).body;
    if (body && typeof body.message === 'string') return body.message;
  }
  return fallback;
}

/**
 * Shape of a single row returned by the watchlist/entity risk-levels ES|QL
 * query. The query groups by `entity.risk.calculated_level`, which can be a
 * named severity string (e.g. "Critical", "Unknown") or `null` for entities
 * without a calculated level.
 */
export interface EsqlSeverityRecord {
  count: number;
  level: string | null;
}

/**
 * Aggregates ES|QL records grouped by `entity.risk.calculated_level` into a
 * {@link SeverityCount}. Rows where `level` is `null` are summed together
 * with rows where `level === 'Unknown'`, because both represent entities
 * whose risk is not yet classified. This prevents silent undercounting when
 * the same bucket is represented twice in a single response (observed when
 * some entities have an explicit "Unknown" level while others have `null`).
 */
export const esqlRecordsToSeverityCount = (records: EsqlSeverityRecord[]): SeverityCount => {
  const sumWhere = (predicate: (r: EsqlSeverityRecord) => boolean) =>
    records.filter(predicate).reduce((acc, r) => acc + (r.count ?? 0), 0);

  return {
    [RiskSeverity.Critical]: sumWhere((r) => r.level === RiskSeverity.Critical),
    [RiskSeverity.High]: sumWhere((r) => r.level === RiskSeverity.High),
    [RiskSeverity.Moderate]: sumWhere((r) => r.level === RiskSeverity.Moderate),
    [RiskSeverity.Low]: sumWhere((r) => r.level === RiskSeverity.Low),
    [RiskSeverity.Unknown]: sumWhere((r) => r.level === RiskSeverity.Unknown || r.level === null),
  };
};
