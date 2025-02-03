/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseData } from './helpers';
import * as severityMock from '../severity_level_panel/mock_data';
import * as alertsRuleMock from '../alerts_by_rule_panel/mock_rule_data';
import * as alertsGroupingMock from '../alerts_progress_bar_panel/mock_data';
import type { SummaryChartsAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse data by aggregation type', () => {
  test('parse severity data', () => {
    const res = parseData(severityMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>);
    expect(res).toEqual(severityMock.parsedAlerts);
  });

  test('parse alert by rule data', () => {
    const resRule = parseData(
      alertsRuleMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(resRule).toEqual(alertsRuleMock.parsedAlerts);
  });

  test('parse alert groupping data', () => {
    const res = parseData(
      alertsGroupingMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(res).toEqual(alertsGroupingMock.parsedAlerts);
  });
});
