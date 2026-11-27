/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC } from '../constants';
import type { CreateSLOForm } from '../types';
import { useResetOnIndicatorTypeChange } from './use_reset_on_indicator_type_change';

jest.mock('../../../hooks/use_fetch_apm_indices', () => ({
  useFetchApmIndices: () => ({ data: { metric: 'metrics-apm*' } }),
}));

const PREFILLED_FILTER = 'service.name: "prefilled"';
const METRIC_FILTER_NAME = 'indicator.params.good.metrics.0.filter';

const prefilledValues: CreateSLOForm = {
  ...SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC,
  indicator: {
    type: 'sli.metric.custom',
    params: {
      index: 'my-index',
      filter: '',
      good: {
        metrics: [{ name: 'A', aggregation: 'sum', field: 'good', filter: PREFILLED_FILTER }],
        equation: 'A',
      },
      total: { metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }], equation: 'A' },
      timestampField: '@timestamp',
    },
  },
};

function MetricFilter() {
  const { control } = useFormContext<CreateSLOForm>();
  return (
    <Controller
      name={METRIC_FILTER_NAME}
      control={control}
      render={({ field: { value } }) => (
        <span data-test-subj="metricFilter">{typeof value === 'string' ? value : ''}</span>
      )}
    />
  );
}

function IndicatorForm() {
  const { control } = useFormContext<CreateSLOForm>();
  const indicatorType = useWatch({ control, name: 'indicator.type' });
  useResetOnIndicatorTypeChange({ isEditMode: false });

  return indicatorType === 'sli.metric.custom' ? <MetricFilter /> : null;
}

const renderTestForm = (): UseFormReturn<CreateSLOForm> => {
  let methods!: UseFormReturn<CreateSLOForm>;

  function TestForm() {
    methods = useForm<CreateSLOForm>({ defaultValues: prefilledValues });
    return (
      <FormProvider {...methods}>
        <IndicatorForm />
      </FormProvider>
    );
  }

  render(<TestForm />);
  return methods;
};

describe('useResetOnIndicatorTypeChange', () => {
  it('does not restore prefilled indicator params when switching back to the same indicator type', () => {
    const { setValue } = renderTestForm();
    expect(screen.getByTestId('metricFilter')).toHaveTextContent(PREFILLED_FILTER);

    act(() => setValue('indicator.type', 'sli.kql.custom'));
    expect(screen.queryByTestId('metricFilter')).not.toBeInTheDocument();

    act(() => setValue('indicator.type', 'sli.metric.custom'));
    expect(screen.getByTestId('metricFilter')).toBeEmptyDOMElement();
  });
});
