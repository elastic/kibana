/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAlertsGroupingData, getAggregateData, formatPercentage } from './helpers';
import * as mock from './mock_data';
import type { AlertsByGroupingAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse progress bar data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsGroupingData(
      mock.mockAlertsData as AlertSearchResponse<{}, AlertsByGroupingAgg>
    );
    expect(res).toEqual(mock.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsGroupingData(
      mock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByGroupingAgg>
    );
    expect(res).toEqual([]);
  });
});

describe('test getAggregateData', () => {
  test('should return correct non-empty value and percentage', () => {
    const res = getAggregateData(mock.parsedAlerts);
    expect(res).toEqual([620, '98.4%']);
    expect(getAggregateData(mock.parsedLargeEmptyAlerts)).toEqual([1, '<1%']);
  });
});

describe('test formatPercentage ', () => {
  test('should return percetange string', () => {
    expect(formatPercentage(0.255)).toEqual('25.5%');
    expect(formatPercentage(0.01)).toEqual('1%');
    expect(formatPercentage(0.005)).toEqual('<1%');
  });
});
