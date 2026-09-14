/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_RULE_PARAMETERS, ALERT_START } from '@kbn/rule-data-utils';
import { formatCustomThresholdAlert } from './format_custom_threshold_alert';
import { Aggregators } from '../../common/custom_threshold_rule/types';

jest.mock('../../common/custom_threshold_rule/get_view_in_app_url', () => ({
  getViewInAppUrl: jest.fn(() => 'mockedUrl'),
}));

const { getViewInAppUrl } = jest.requireMock(
  '../../common/custom_threshold_rule/get_view_in_app_url'
);

describe('formatCustomThresholdAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseCriterion = {
    metrics: [{ name: 'A', aggType: Aggregators.COUNT }],
    timeSize: 7,
    timeUnit: 'd',
    comparator: '>',
    threshold: [0],
  };

  it('normalizes criteria from a single object to an array', () => {
    const fields = {
      [ALERT_RULE_PARAMETERS]: {
        criteria: baseCriterion,
        searchConfiguration: { index: 'test-index', query: { query: '', language: 'kuery' } },
      },
      [ALERT_REASON]: 'test reason',
      [ALERT_START]: '2023-12-07T16:30:15.403Z',
    };

    formatCustomThresholdAlert(fields);

    expect(getViewInAppUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: baseCriterion.metrics,
        timeSize: 7,
        timeUnit: 'd',
      })
    );
  });

  it('handles criteria as an array (normal case)', () => {
    const fields = {
      [ALERT_RULE_PARAMETERS]: {
        criteria: [baseCriterion],
        searchConfiguration: { index: 'test-index', query: { query: '', language: 'kuery' } },
      },
      [ALERT_REASON]: 'test reason',
      [ALERT_START]: '2023-12-07T16:30:15.403Z',
    };

    formatCustomThresholdAlert(fields);

    expect(getViewInAppUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: baseCriterion.metrics,
        timeSize: 7,
        timeUnit: 'd',
      })
    );
  });

  it('handles missing criteria gracefully', () => {
    const fields = {
      [ALERT_RULE_PARAMETERS]: {
        searchConfiguration: { index: 'test-index', query: { query: '', language: 'kuery' } },
      },
      [ALERT_REASON]: 'test reason',
      [ALERT_START]: '2023-12-07T16:30:15.403Z',
    };

    formatCustomThresholdAlert(fields);

    expect(getViewInAppUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: [],
        timeSize: undefined,
        timeUnit: undefined,
      })
    );
  });

  it('does not pass timeSize/timeUnit for multi-criteria rules', () => {
    const fields = {
      [ALERT_RULE_PARAMETERS]: {
        criteria: [baseCriterion, { ...baseCriterion, timeSize: 1, timeUnit: 'h' }],
        searchConfiguration: { index: 'test-index', query: { query: '', language: 'kuery' } },
      },
      [ALERT_REASON]: 'test reason',
      [ALERT_START]: '2023-12-07T16:30:15.403Z',
    };

    formatCustomThresholdAlert(fields);

    expect(getViewInAppUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: [],
        timeSize: undefined,
        timeUnit: undefined,
      })
    );
  });

  it('returns reason from fields or falls back to "-"', () => {
    const fields = {
      [ALERT_RULE_PARAMETERS]: { criteria: [], searchConfiguration: {} },
    };

    const result = formatCustomThresholdAlert(fields);

    expect(result.reason).toBe('-');
  });
});
