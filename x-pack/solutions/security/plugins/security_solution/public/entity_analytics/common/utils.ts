/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import { useEuiTheme } from '@elastic/eui';
import { RiskSeverity } from '../../../common/search_strategy';
import { SEVERITY_COLOR } from '../../overview/components/detection_response/utils';
export { RISK_LEVEL_RANGES as RISK_SCORE_RANGES } from '../../../common/entity_analytics/risk_engine';

export const SEVERITY_UI_SORT_ORDER = [
  RiskSeverity.Unknown,
  RiskSeverity.Low,
  RiskSeverity.Moderate,
  RiskSeverity.High,
  RiskSeverity.Critical,
];

export const RISK_SEVERITY_COLOUR: { [k in RiskSeverity]: string } = {
  [RiskSeverity.Unknown]: euiLightVars.euiColorMediumShade,
  [RiskSeverity.Low]: SEVERITY_COLOR.low,
  [RiskSeverity.Moderate]: SEVERITY_COLOR.medium,
  [RiskSeverity.High]: SEVERITY_COLOR.high,
  [RiskSeverity.Critical]: SEVERITY_COLOR.critical,
};

export const useRiskSeverityColors = (): { [k in RiskSeverity]: string } => {
  const { euiTheme } = useEuiTheme();
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  return {
    [RiskSeverity.Unknown]: euiTheme.colors.vis.euiColorVisNeutral0, // TODO: this is a closest guess based on severity colors, change to grey20 when available
    // TODO: update these with V9.0.0 severity palette colors when available / keep if the below are  updated with the palette
    [RiskSeverity.Low]: isAmsterdam
      ? euiTheme.colors.vis.euiColorVis0
      : euiTheme.colors.vis.euiColorVis0,
    [RiskSeverity.Moderate]: isAmsterdam
      ? euiTheme.colors.vis.euiColorVis5
      : euiTheme.colors.vis.euiColorVis9,
    [RiskSeverity.High]: isAmsterdam
      ? euiTheme.colors.vis.euiColorVis7
      : euiTheme.colors.vis.euiColorVis8,
    [RiskSeverity.Critical]: isAmsterdam
      ? euiTheme.colors.vis.euiColorVis9
      : euiTheme.colors.vis.euiColorVis6,
  };
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

export const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};
