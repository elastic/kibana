/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SummaryChartsAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { parseSeverityData, getIsAlertsBySeverityAgg } from '../severity_level_panel/helpers';
import { parseAlertsRuleData, getIsAlertsByRuleAgg } from '../alerts_by_rule_panel/helpers';
import {
  parseAlertsGroupingData,
  getIsAlertsByGroupingAgg,
} from '../alerts_progress_bar_panel/helpers';
import {
  parseChartCollapseData,
  getIsChartCollapseAgg,
} from '../chart_panels/chart_collapse/helpers';

export const parseData = (data: AlertSearchResponse<{}, SummaryChartsAgg>) => {
  if (getIsAlertsBySeverityAgg(data)) {
    return parseSeverityData(data);
  }
  if (getIsAlertsByRuleAgg(data)) {
    return parseAlertsRuleData(data);
  }
  if (getIsAlertsByGroupingAgg(data)) {
    return parseAlertsGroupingData(data);
  }
  if (getIsChartCollapseAgg(data)) {
    return parseChartCollapseData(data);
  }
  return [];
};
