/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';
import type { ChartCollapseAgg, ChartCollapseData } from './types';
import type { AlertSearchResponse } from '../../../../containers/detection_engine/alerts/types';
import type { SummaryChartsData, SummaryChartsAgg } from '../../alerts_summary_charts_panel/types';
import { severityLabels } from '../../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { UNKNOWN_SEVERITY } from '../../severity_level_panel/translations';

export const parseChartCollapseData = (
  response: AlertSearchResponse<{}, ChartCollapseAgg>
): ChartCollapseData[] => {
  const ret: ChartCollapseData = { rule: null, group: null, severities: [] };
  ret.rule = response?.aggregations?.topRule?.buckets?.at(0)?.key ?? null;
  ret.group = response?.aggregations?.topGrouping?.buckets?.at(0)?.key ?? null;

  const severityBuckets = response?.aggregations?.severities?.buckets ?? [];
  if (severityBuckets.length > 0) {
    ret.severities = severityBuckets.map((severity) => {
      return {
        key: severity.key,
        value: severity.doc_count,
        label: severityLabels[severity.key] ?? UNKNOWN_SEVERITY,
      };
    });
    return [ret];
  }
  return [];
};

export const getIsChartCollapseData = (data: SummaryChartsData[]): data is ChartCollapseData[] => {
  return data?.every((x) => has(x, 'rule') && has(x, 'group') && has(x, 'severities'));
};

export const getIsChartCollapseAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, ChartCollapseAgg> => {
  return (
    has(data, 'aggregations.severities') &&
    has(data, 'aggregations.topRule') &&
    has(data, 'aggregations.topGrouping')
  );
};
