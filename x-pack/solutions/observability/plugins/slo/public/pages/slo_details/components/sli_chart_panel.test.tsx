/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { useKibana } from '../../../hooks/use_kibana';
import { render } from '../../../utils/test_helper';
import { buildSlo } from '../../../data/slo/slo';
import { SliChartPanel } from './sli_chart_panel';
import type { ChartData } from '../../../typings/slo';

jest.mock('../../../hooks/use_kibana');

const useKibanaMock = useKibana as jest.Mock;

const mockChartData: ChartData[] = [
  { key: new Date('2024-01-01').getTime(), value: 0.99 },
  { key: new Date('2024-01-02').getTime(), value: 0.98 },
  { key: new Date('2024-01-03').getTime(), value: 0.97 },
];

describe('SliChartPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        theme: {},
        charts: chartPluginMock.createStartContract(),
        uiSettings: {
          get: (settings: string) => {
            if (settings === 'format:percent:defaultPattern') return '0.0%';
            if (settings === 'dateFormat') return 'YYYY-MM-DD';
            return '';
          },
        },
      },
    });
  });

  it('renders the SLI chart panel', () => {
    const slo = buildSlo();
    render(<SliChartPanel data={mockChartData} isLoading={false} slo={slo} hideMetadata={false} />);

    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
  });

  it('uses provided observedValue when available', () => {
    const slo = buildSlo();
    const observedValue = 0.95;
    render(
      <SliChartPanel
        data={mockChartData}
        isLoading={false}
        slo={slo}
        hideMetadata={false}
        observedValue={observedValue}
      />
    );

    // Should display the provided observed value (95.0%)
    expect(screen.getByText('95.0%')).toBeTruthy();
    expect(screen.getByText('Observed value')).toBeTruthy();
  });

  it('falls back to slo.summary.sliValue when observedValue is not provided', () => {
    const slo = buildSlo({
      objective: { target: 0.95 }, // Different from sliValue to avoid confusion
      summary: {
        status: 'HEALTHY',
        sliValue: 0.98,
        errorBudget: {
          initial: 0.05,
          consumed: 0.02,
          remaining: 0.98,
          isEstimated: false,
        },
        fiveMinuteBurnRate: 0,
        oneHourBurnRate: 0,
        oneDayBurnRate: 0,
      },
    });
    render(<SliChartPanel data={mockChartData} isLoading={false} slo={slo} hideMetadata={false} />);

    // Should display the SLO summary value (98.0%) as observed value
    // Objective should be 95.0%
    const observedValueElements = screen.getAllByText('98.0%');
    expect(observedValueElements.length).toBeGreaterThan(0);
    expect(screen.getByText('95.0%')).toBeTruthy();
  });

  it('handles NO_DATA status when observedValue is provided and negative', () => {
    const slo = buildSlo();
    const observedValue = -1; // NO_DATA indicator
    render(
      <SliChartPanel
        data={mockChartData}
        isLoading={false}
        slo={slo}
        hideMetadata={false}
        observedValue={observedValue}
      />
    );

    // Should display '-' for NO_DATA
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('handles NO_DATA status from slo.summary when observedValue is not provided', () => {
    const slo = buildSlo({
      summary: {
        status: 'NO_DATA',
        sliValue: -1,
        errorBudget: {
          initial: 0.05,
          consumed: 0,
          remaining: 1,
          isEstimated: false,
        },
        fiveMinuteBurnRate: 0,
        oneHourBurnRate: 0,
        oneDayBurnRate: 0,
      },
    });
    render(<SliChartPanel data={mockChartData} isLoading={false} slo={slo} hideMetadata={false} />);

    // Should display '-' for NO_DATA
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('hides metadata when hideMetadata is true', () => {
    const slo = buildSlo();
    render(<SliChartPanel data={mockChartData} isLoading={false} slo={slo} hideMetadata={true} />);

    // Metadata should not be visible
    expect(screen.queryByText('Observed value')).toBeFalsy();
    expect(screen.queryByText('Objective')).toBeFalsy();
  });

  it('displays objective value correctly', () => {
    const slo = buildSlo({ objective: { target: 0.95 } });
    render(<SliChartPanel data={mockChartData} isLoading={false} slo={slo} hideMetadata={false} />);

    // Should display objective (95.0%)
    const objectiveElements = screen.getAllByText('95.0%');
    expect(objectiveElements.length).toBeGreaterThan(0);
  });

  it('uses observedValue over slo.summary.sliValue when both are available', () => {
    const slo = buildSlo({
      objective: { target: 0.95 }, // Different from both observedValue and sliValue
      summary: {
        status: 'HEALTHY',
        sliValue: 0.98,
        errorBudget: {
          initial: 0.05,
          consumed: 0.02,
          remaining: 0.98,
          isEstimated: false,
        },
        fiveMinuteBurnRate: 0,
        oneHourBurnRate: 0,
        oneDayBurnRate: 0,
      },
    });
    const observedValue = 0.92;
    render(
      <SliChartPanel
        data={mockChartData}
        isLoading={false}
        slo={slo}
        hideMetadata={false}
        observedValue={observedValue}
      />
    );

    // Should display the observed value (92.0%), not the summary value (98.0%)
    // Objective should be 95.0%
    expect(screen.getByText('92.0%')).toBeTruthy();
    expect(screen.getByText('95.0%')).toBeTruthy();
    // Summary value (98.0%) should not appear as observed value
    const all98Elements = screen.queryAllByText('98.0%');
    // 98.0% should only appear if it's the objective, but we set objective to 95.0%
    expect(all98Elements.length).toBe(0);
  });
});
