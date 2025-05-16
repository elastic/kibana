/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { has } from 'lodash';
import type { AlertsByRuleData, AlertsByRuleAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { SummaryChartsData, SummaryChartsAgg } from '../alerts_summary_charts_panel/types';

export const parseAlertsRuleData = (
  response: AlertSearchResponse<{}, AlertsByRuleAgg>
): AlertsByRuleData[] => {
  const rulesBuckets = response?.aggregations?.alertsByRule?.buckets ?? [];

  return rulesBuckets.length === 0
    ? []
    : rulesBuckets.map((rule) => {
        return {
          rule: rule.key,
          value: rule.doc_count,
        };
      });
};

export const getIsAlertsByRuleData = (data: SummaryChartsData[]): data is AlertsByRuleData[] => {
  return data.length > 0 && data.every((x) => has(x, 'rule'));
};

export const getIsAlertsByRuleAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsByRuleAgg> => {
  return has(data, 'aggregations.alertsByRule');
};
