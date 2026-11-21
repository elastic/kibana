/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MetricExpression } from './metrics_expression';

jest.mock('../../../containers/metrics_source', () => ({
  useMetricsDataViewContext: () => ({
    metricsView: { fields: [{ name: 'system.cpu.total.pct', aggregatable: true, type: 'number' }] },
  }),
}));

const metrics = [{ value: 'cpuV2', text: 'CPU usage' }];

const renderExpression = (props: Partial<React.ComponentProps<typeof MetricExpression>>) =>
  render(
    <I18nProvider>
      <MetricExpression
        metric={{ value: 'custom', text: 'Custom' }}
        metrics={metrics}
        nodeType="host"
        errors={{ metric: [] }}
        onChange={jest.fn()}
        onChangeCustom={jest.fn()}
        {...props}
      />
    </I18nProvider>
  );

describe('MetricExpression', () => {
  it('shows the error text under the custom metric field when it is invalid', async () => {
    renderExpression({ errors: { metric: ['Field is required.'] } });

    await userEvent.click(screen.getByRole('button', { name: /When/ }));

    expect(screen.getByText('Field is required.')).toBeInTheDocument();
  });

  it('does not show error text when the metric is valid', async () => {
    renderExpression({
      customMetric: { type: 'custom', field: 'system.cpu.total.pct', aggregation: 'avg' },
    });

    await userEvent.click(screen.getByRole('button', { name: /When/ }));

    expect(screen.queryByText('Field is required.')).not.toBeInTheDocument();
  });

  it('shows the error text under the default metric selector', async () => {
    renderExpression({
      metric: undefined,
      errors: { metric: ['Metric is required.'] },
    });

    await userEvent.click(screen.getByRole('button', { name: /When/ }));

    expect(screen.getByText('Metric is required.')).toBeInTheDocument();
  });
});
