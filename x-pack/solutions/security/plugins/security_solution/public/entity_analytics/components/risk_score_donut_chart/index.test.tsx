/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../common/search_strategy';
import type { SeverityCount } from '../severity/types';
import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreDonutChart } from '.';
import { TestProviders } from '../../../common/mock';
import { DonutChart } from '../../../common/components/charts/donutchart';

jest.mock('../../../common/components/charts/donutchart', () => {
  const actual = jest.requireActual('../../../common/components/charts/donutchart');
  return {
    ...actual,
    DonutChart: jest.fn(() => <div data-test-subj="mock-donut-chart" />),
  };
});

const mockDonutChart = DonutChart as unknown as jest.Mock;

const severityCount: SeverityCount = {
  [RiskSeverity.Low]: 1,
  [RiskSeverity.High]: 1,
  [RiskSeverity.Moderate]: 1,
  [RiskSeverity.Unknown]: 1,
  [RiskSeverity.Critical]: 1,
};

describe('RiskScoreDonutChart', () => {
  beforeEach(() => {
    mockDonutChart.mockClear();
  });

  it('renders legends', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskScoreDonutChart severityCount={severityCount} />
      </TestProviders>
    );

    expect(getByTestId('legend')).toHaveTextContent('Unknown');
    expect(getByTestId('legend')).toHaveTextContent('Low');
    expect(getByTestId('legend')).toHaveTextContent('Moderate');
    expect(getByTestId('legend')).toHaveTextContent('High');
    expect(getByTestId('legend')).toHaveTextContent('Critical');
  });

  it('does not pass an onPartitionClick handler to the donut when none is provided', () => {
    render(
      <TestProviders>
        <RiskScoreDonutChart severityCount={severityCount} showLegend={false} />
      </TestProviders>
    );

    expect(mockDonutChart).toHaveBeenCalled();
    const props = mockDonutChart.mock.calls[0][0];
    expect(props.onPartitionClick).toBeUndefined();
  });

  it('invokes the onPartitionClick callback with the clicked RiskSeverity', () => {
    const onPartitionClick = jest.fn();

    render(
      <TestProviders>
        <RiskScoreDonutChart
          severityCount={severityCount}
          showLegend={false}
          onPartitionClick={onPartitionClick}
        />
      </TestProviders>
    );

    expect(mockDonutChart).toHaveBeenCalled();
    const props = mockDonutChart.mock.calls[0][0];
    expect(typeof props.onPartitionClick).toBe('function');

    props.onPartitionClick(RiskSeverity.Critical);
    expect(onPartitionClick).toHaveBeenCalledWith(RiskSeverity.Critical);
  });
});
