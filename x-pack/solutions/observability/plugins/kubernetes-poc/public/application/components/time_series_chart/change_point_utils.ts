/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Change point types returned by the CHANGE_POINT ES|QL function
 */
export type ChangePointType =
  | 'dip'
  | 'distribution_change'
  | 'spike'
  | 'step_change'
  | 'trend_change'
  | 'stationary'
  | 'non_stationary';

/**
 * Impact level based on p-value
 */
export type ChangePointImpact = 'high' | 'medium' | 'low';

/**
 * EUI theme color keys that can be used for change point visualization
 */
type EuiThemeColor = keyof {
  [K in keyof EuiThemeComputed['colors']]: EuiThemeComputed['colors'][K] extends string ? K : never;
};

/**
 * Formatted change point data for rendering annotations
 */
export interface FormattedChangePoint {
  timestamp: number;
  type: ChangePointType;
  pvalue: number;
  impact: ChangePointImpact;
  label: string;
  color: EuiThemeColor;
}

/**
 * Raw change point data from ES|QL CHANGE_POINT function
 */
export interface RawChangePointData {
  timestamp: string | number;
  type: string | null;
  pvalue: number | null;
  [key: string]: unknown;
}

/**
 * Convert p-value to impact level
 * Lower p-values indicate more significant changes
 */
export function pValueToImpact(pValue: number): ChangePointImpact {
  if (pValue < 0.01) {
    return 'high';
  }
  if (pValue < 0.05) {
    return 'medium';
  }
  return 'low';
}

/**
 * Get color and label for impact level
 */
function getImpactProperties(impact: ChangePointImpact): {
  color: EuiThemeColor;
  label: string;
} {
  if (impact === 'high') {
    return {
      color: 'danger',
      label: i18n.translate('xpack.kubernetesPoc.changePoint.impactHigh', {
        defaultMessage: 'High',
      }),
    };
  }

  if (impact === 'medium') {
    return {
      color: 'warning',
      label: i18n.translate('xpack.kubernetesPoc.changePoint.impactMedium', {
        defaultMessage: 'Medium',
      }),
    };
  }

  return {
    color: 'vis.euiColorVis0',
    label: i18n.translate('xpack.kubernetesPoc.changePoint.impactLow', {
      defaultMessage: 'Low',
    }),
  };
}

/**
 * Get human-readable label for change point type
 */
export function getChangePointTypeLabel(type: ChangePointType): string {
  const labels: Record<ChangePointType, string> = {
    dip: i18n.translate('xpack.kubernetesPoc.changePoint.typeDip', {
      defaultMessage: 'Dip',
    }),
    spike: i18n.translate('xpack.kubernetesPoc.changePoint.typeSpike', {
      defaultMessage: 'Spike',
    }),
    step_change: i18n.translate('xpack.kubernetesPoc.changePoint.typeStepChange', {
      defaultMessage: 'Step change',
    }),
    trend_change: i18n.translate('xpack.kubernetesPoc.changePoint.typeTrendChange', {
      defaultMessage: 'Trend change',
    }),
    distribution_change: i18n.translate('xpack.kubernetesPoc.changePoint.typeDistributionChange', {
      defaultMessage: 'Distribution change',
    }),
    stationary: i18n.translate('xpack.kubernetesPoc.changePoint.typeStationary', {
      defaultMessage: 'Stationary',
    }),
    non_stationary: i18n.translate('xpack.kubernetesPoc.changePoint.typeNonStationary', {
      defaultMessage: 'Non-stationary',
    }),
  };

  return labels[type] || type;
}

/**
 * Check if a change point type is significant (not stationary or non_stationary)
 */
export function isSignificantChangePoint(type: ChangePointType | string | null): boolean {
  return type !== null && type !== 'stationary' && type !== 'non_stationary';
}

/**
 * Format raw change point data from ES|QL into a renderable format
 */
export function formatChangePoint(data: RawChangePointData): FormattedChangePoint | null {
  const { timestamp, type, pvalue } = data;

  // Skip non-significant change points
  if (!isSignificantChangePoint(type) || pvalue === null) {
    return null;
  }

  const changeType = type as ChangePointType;
  const impact = pValueToImpact(pvalue);
  const impactProps = getImpactProperties(impact);

  return {
    timestamp: typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp,
    type: changeType,
    pvalue,
    impact,
    label: impactProps.label,
    color: impactProps.color,
  };
}

/**
 * Extract change points from ES|QL query results
 * Filters out stationary/non_stationary points and formats the data
 */
export function extractChangePoints(
  data: RawChangePointData[],
  timestampField = 'timestamp',
  typeField = 'type',
  pvalueField = 'pvalue'
): FormattedChangePoint[] {
  return data
    .map((row) => {
      const rawData: RawChangePointData = {
        timestamp: row[timestampField] as string | number,
        type: row[typeField] as string | null,
        pvalue: row[pvalueField] as number | null,
      };
      return formatChangePoint(rawData);
    })
    .filter((cp): cp is FormattedChangePoint => cp !== null);
}
