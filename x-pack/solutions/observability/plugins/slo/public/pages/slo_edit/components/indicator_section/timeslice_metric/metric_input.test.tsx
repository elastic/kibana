/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '../../../../../utils/test_helper';
import type { CreateSLOForm } from '../../../types';
import { MetricInput } from './metric_input';

const indexFields: FieldSpec[] = [
  { name: 'latency.number', type: 'number', searchable: true, aggregatable: true },
  { name: 'latency.histogram', type: 'histogram', searchable: false, aggregatable: true },
  {
    name: 'latency.exponential_histogram',
    type: 'exponential_histogram',
    searchable: false,
    aggregatable: true,
  },
  { name: 'service.name', type: 'string', searchable: true, aggregatable: true },
];

const renderMetricInput = (aggregation: 'avg' | 'cardinality') => {
  function Wrapper() {
    const methods = useForm<CreateSLOForm>({
      defaultValues: {
        indicator: {
          type: 'sli.metric.timeslice',
          params: {
            metric: { metrics: [{ name: 'A', aggregation, field: '' }] },
          },
        },
      },
    });
    return (
      <FormProvider {...methods}>
        <MetricInput
          metricIndex={0}
          indexPattern="metrics-*"
          isLoadingIndex={false}
          indexFields={indexFields}
        />
      </FormProvider>
    );
  }

  render(<Wrapper />);
};

const getFieldOptionLabels = async (): Promise<string[]> => {
  await userEvent.click(screen.getByRole('combobox', { name: 'Select a metric field' }));
  const listbox = await screen.findByRole('listbox');
  return within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
};

describe('<MetricInput />', () => {
  it('offers number, histogram and exponential_histogram fields for numeric aggregations', async () => {
    renderMetricInput('avg');

    expect(await getFieldOptionLabels()).toEqual([
      'latency.exponential_histogram',
      'latency.histogram',
      'latency.number',
    ]);
  });

  it('does not offer histogram fields for the cardinality aggregation', async () => {
    renderMetricInput('cardinality');

    expect(await getFieldOptionLabels()).toEqual(['latency.number', 'service.name']);
  });
});
