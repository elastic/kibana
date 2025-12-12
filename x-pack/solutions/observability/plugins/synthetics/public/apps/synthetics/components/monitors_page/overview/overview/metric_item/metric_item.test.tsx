/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMetricValueProps } from './metric_item';
import type { OverviewTrend } from '../../../../../../../../common/types';
import { FormattedMessage } from '@kbn/i18n-react';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: jest.fn(),
}));

describe('getMetricValueProps', () => {
  it('returns loading state props when trendData is loading', () => {
    const result = getMetricValueProps('loading');
    expect(result).toEqual({
      value: '',
      extra: expect.any(Object),
    });
  });

  it('returns a no-data message when trendData is null or undefined', () => {
    const nullResult = getMetricValueProps(null);

    expect(nullResult).toEqual({
      value: '',
      extra: expect.objectContaining({
        type: FormattedMessage,
        props: {
          id: 'xpack.synthetics.overview.metricItem.noDataAvailableMessage',
          defaultMessage: '--',
        },
      }),
    });

    const undefinedResult = getMetricValueProps(undefined);
    expect(undefinedResult).toEqual({
      value: '',
      extra: expect.objectContaining({
        type: FormattedMessage,
        props: {
          id: 'xpack.synthetics.overview.metricItem.noDataAvailableMessage',
          defaultMessage: '--',
        },
      }),
    });
  });

  it('returns metric value props when trendData is available', () => {
    const trendData: OverviewTrend = {
      configId: 'test-config',
      locationId: 'test-location',
      data: [],
      count: 50,
      median: 1500,
      min: 1000,
      max: 2000,
      avg: 1600,
      sum: 80000,
    };

    const result = getMetricValueProps(trendData);

    expect(result).toEqual(
      expect.objectContaining({
        value: trendData.median,
        valueFormatter: expect.any(Function),
        extra: expect.any(Object),
      })
    );
  });
});
