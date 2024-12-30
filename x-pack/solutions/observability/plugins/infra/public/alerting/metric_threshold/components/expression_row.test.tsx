/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolvedDataView } from '../../../utils/data_view';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { MetricExpression } from '../types';
import { ExpressionRow } from './expression_row';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { DataView, type FieldSpec } from '@kbn/data-views-plugin/common';

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: TIMESTAMP_FIELD,
  fields: [
    {
      name: 'system.cpu.user.pct',
      type: 'test',
      searchable: true,
      aggregatable: true,
    },
    {
      name: 'system.load.1',
      type: 'test',
      searchable: true,
      aggregatable: true,
    },
  ] as Partial<FieldSpec[]>,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as jest.Mocked<DataView>;

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

describe('ExpressionRow', () => {
  async function setup(expression: MetricExpression) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        canDelete={false}
        remove={() => {}}
        addExpression={() => {}}
        key={1}
        expressionId={1}
        setRuleParams={() => {}}
        errors={{
          aggField: [],
          timeSizeUnit: [],
          timeWindowSize: [],
        }}
        expression={expression}
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

  it('should display thresholds as a percentage for pct metrics', async () => {
    const expression = {
      metric: 'system.cpu.user.pct',
      comparator: COMPARATORS.GREATER_THAN,
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      aggType: 'avg',
    };
    const { wrapper, update } = await setup(expression as MetricExpression);
    await update();
    const [valueMatch] =
      wrapper
        .html()
        .match('<span class="euiExpression__value css-1lfq7nz-euiExpression__value">50</span>') ??
      [];
    expect(valueMatch).toBeTruthy();
  });

  it('should display thresholds as a decimal for all other metrics', async () => {
    const expression = {
      metric: 'system.load.1',
      comparator: COMPARATORS.GREATER_THAN,
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      aggType: 'avg',
    };
    const { wrapper } = await setup(expression as MetricExpression);
    const [valueMatch] =
      wrapper
        .html()
        .match('<span class="euiExpression__value css-1lfq7nz-euiExpression__value">0.5</span>') ??
      [];
    expect(valueMatch).toBeTruthy();
  });

  it('should render a helpText for the of expression', async () => {
    const expression = {
      metric: 'system.load.1',
      comparator: COMPARATORS.GREATER_THAN,
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      aggType: 'avg',
    } as MetricExpression;

    const { wrapper } = await setup(expression as MetricExpression);

    const helpText = wrapper.find('[data-test-subj="ofExpression"]').at(0).prop('helpText');

    expect(helpText).toMatchSnapshot();
  });
});
