/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { baseSlo } from '../../../../data/slo';
import { SloCardChart } from './slo_card_item';

const mockSettings = jest.fn<void, [Record<string, unknown>]>();

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: (props: Record<string, unknown>) => {
    mockSettings(props);
    return null;
  },
  Metric: () => null,
  MetricTrendShape: { Area: 'area' },
  isMetricElementEvent: jest.fn(() => false),
}));

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: { navigateToUrl: jest.fn() },
      charts: { theme: { useChartsBaseTheme: jest.fn(() => ({})) } },
    },
  }),
}));

jest.mock('../../hooks/use_slo_summary', () => ({
  useSloFormattedSummary: jest.fn(() => ({
    sliValue: '99.8%',
    sloTarget: '98%',
    sloDetailsUrl: '/app/observability/slos/slo-123',
  })),
}));

const slo = { ...baseSlo, id: 'slo-123' };

describe('SloCardChart interactivity', () => {
  beforeEach(() => {
    mockSettings.mockClear();
  });

  it('wires onElementClick into the chart Settings when interactive', () => {
    render(<SloCardChart slo={slo} badges={null} isInteractive={true} />);

    const lastProps = mockSettings.mock.calls.at(-1)?.[0];
    expect(typeof lastProps?.onElementClick).toBe('function');
  });

  it('omits onElementClick from the chart Settings when not interactive', () => {
    render(<SloCardChart slo={slo} badges={null} isInteractive={false} />);

    const lastProps = mockSettings.mock.calls.at(-1)?.[0];
    expect(lastProps?.onElementClick).toBeUndefined();
  });
});
