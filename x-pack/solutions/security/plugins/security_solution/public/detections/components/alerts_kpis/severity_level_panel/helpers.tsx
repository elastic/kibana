/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { has } from 'lodash';
import type { EuiThemeComputed } from '@elastic/eui';
import type { AlertsBySeverityAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { SummaryChartsData, SummaryChartsAgg } from '../alerts_summary_charts_panel/types';
import { severityLabels } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { getRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export const getSeverityColor = (severity: string, euiTheme: EuiThemeComputed) => {
  const palette = getRiskSeverityColors(euiTheme);
  return palette[severity.toLocaleLowerCase() as Severity] ?? euiTheme.colors.textSubdued;
};

export const parseSeverityData = (
  response: AlertSearchResponse<{}, AlertsBySeverityAgg>
): SeverityData[] => {
  const severityBuckets = response?.aggregations?.statusBySeverity?.buckets ?? [];

  return severityBuckets.length === 0
    ? []
    : severityBuckets
        .map((severity) => {
          return {
            key: severity.key,
            value: severity.doc_count,
            label: severityLabels[severity.key],
          };
        })
        .sort((a, b) => {
          const aIndex = SEVERITY_ORDER.indexOf(a.key);
          const bIndex = SEVERITY_ORDER.indexOf(b.key);
          return aIndex - bIndex;
        });
};

export const getIsAlertsBySeverityData = (data: SummaryChartsData[]): data is SeverityData[] => {
  return data?.every((x) => has(x, 'key'));
};

export const getIsAlertsBySeverityAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsBySeverityAgg> => {
  return has(data, 'aggregations.statusBySeverity');
};
