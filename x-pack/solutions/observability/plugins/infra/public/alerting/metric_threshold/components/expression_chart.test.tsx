/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { LineAnnotation, RectAnnotation } from '@elastic/charts';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { Aggregators } from '../../../../common/alerting/metrics';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { MetricExpression } from '../types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ExpressionChart } from './expression_chart';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { ResolvedDataView } from '../../../utils/data_view';

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: TIMESTAMP_FIELD,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as jest.Mocked<DataView>;

const mockStartServices = mockCoreMock.createStart();
jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      ...mockStartServices,
      charts: {
        activeCursor: jest.fn(),
        theme: {
          useChartsBaseTheme: jest.fn(() => ({})),
        },
      },
    },
  }),
}));

jest.mock('../../../containers/metrics_source', () => ({
  withSourceProvider: () => jest.fn,
  useSourceContext: () => ({
    source: { id: 'default' },
  }),
  useMetricsDataViewContext: () => ({
    metricsView: {
      indices: 'metricbeat-*',
      timeFieldName: mockDataView.timeFieldName,
      fields: mockDataView.fields,
      dataViewReference: mockDataView,
    } as ResolvedDataView,
    loading: false,
    error: undefined,
  }),
}));

const mockResponse = {
  pageInfo: {
    afterKey: null,
    total: 0,
  },
  series: [{ id: 'Everything', rows: [], columns: [] }],
};

jest.mock('../hooks/use_metrics_explorer_chart_data', () => ({
  useMetricsExplorerChartData: () => ({ loading: false, data: { pages: [mockResponse] } }),
}));

describe('ExpressionChart', () => {
  async function setup(
    expression: MetricExpression,
    filterQuery?: string,
    groupBy?: string,
    annotations?: Array<ReactElement<typeof RectAnnotation | typeof LineAnnotation>>
  ) {
    const wrapper = mountWithIntl(
      <ExpressionChart
        expression={expression}
        filterQuery={filterQuery}
        groupBy={groupBy}
        annotations={annotations}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update };
  }

  it('should display no data message', async () => {
    const expression: MetricExpression = {
      aggType: Aggregators.AVERAGE,
      timeSize: 1,
      timeUnit: 'm',
      sourceId: 'default',
      threshold: [1],
      comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
    };
    const { wrapper } = await setup(expression);
    expect(wrapper.find('[data-test-subj~="noChartData"]').exists()).toBeTruthy();
  });
});
