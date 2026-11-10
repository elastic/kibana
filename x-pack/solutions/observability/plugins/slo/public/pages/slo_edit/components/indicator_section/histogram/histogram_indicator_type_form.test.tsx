/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { render } from '../../../../../utils/test_helper';
import { useIndicatorDataView } from '../custom_common/use_indicator_data_view';
import { HistogramIndicator } from './histogram_indicator';
import { HistogramIndicatorTypeForm } from './histogram_indicator_type_form';

jest.mock('../custom_common/use_indicator_data_view');
jest.mock('./histogram_indicator', () => ({ HistogramIndicator: jest.fn(() => null) }));
jest.mock('../custom_common/index_and_timestamp_field', () => ({
  IndexAndTimestampField: () => null,
}));
jest.mock('../../common/query_builder', () => ({ QueryBuilder: () => null }));
jest.mock('../../common/group_by_field', () => ({ GroupByField: () => null }));
jest.mock('../../common/data_preview_chart', () => ({ DataPreviewChart: () => null }));

const dataView = createStubDataView({
  spec: {
    id: 'test-data-view',
    title: 'metrics-*',
    fields: {
      'latency.number': {
        name: 'latency.number',
        type: 'number',
        searchable: true,
        aggregatable: true,
      },
      'latency.histogram': {
        name: 'latency.histogram',
        type: 'histogram',
        searchable: false,
        aggregatable: true,
      },
      'latency.exponential_histogram': {
        name: 'latency.exponential_histogram',
        type: 'exponential_histogram',
        searchable: false,
        aggregatable: true,
      },
      'service.name': {
        name: 'service.name',
        type: 'string',
        searchable: true,
        aggregatable: true,
      },
    },
  },
});

describe('<HistogramIndicatorTypeForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useIndicatorDataView).mockReturnValue({ dataView, loading: false });
  });

  it('offers histogram and exponential_histogram fields for good and total events', () => {
    render(<HistogramIndicatorTypeForm />);

    const fieldNamesByType = jest
      .mocked(HistogramIndicator)
      .mock.calls.map(([{ type, histogramFields }]) => ({
        type,
        fieldNames: Array.from(histogramFields, ({ name }) => name).sort(),
      }));

    expect(fieldNamesByType).toEqual([
      { type: 'good', fieldNames: ['latency.exponential_histogram', 'latency.histogram'] },
      { type: 'total', fieldNames: ['latency.exponential_histogram', 'latency.histogram'] },
    ]);
  });
});
