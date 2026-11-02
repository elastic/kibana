/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AttacksVolumePanel } from './attacks_volume_panel';
import * as Hook from './use_attacks_volume_data';
import { KibanaContextProvider } from '../../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';

const kibanaContextMock = createStartServicesMock();

jest.mock('./use_attacks_volume_data');
jest.mock('../../../../../common/components/charts/common', () => ({
  useThemes: jest.fn(() => ({
    theme: {},
    baseTheme: {},
  })),
}));
jest.mock('@elastic/charts', () => ({
  Chart: (props: { children: React.ReactNode }) => (
    <div data-test-subj="mock-chart">{props.children}</div>
  ),
  Settings: () => null,
  LineSeries: () => <div data-test-subj="mock-line-series" />,
  Axis: () => null,
  Position: { Bottom: 'bottom', Left: 'left' },
  ScaleType: { Time: 'time' },
  CurveType: { CURVE_MONOTONE_X: 'monotone_x' },
  timeFormatter: () => jest.fn(),
}));

describe('AttacksVolumePanel', () => {
  const mockUseAttacksVolumeData = Hook.useAttacksVolumeData as jest.Mock;

  beforeEach(() => {
    mockUseAttacksVolumeData.mockReturnValue({
      items: [],
      isLoading: false,
      intervalMs: 1000,
      refetch: jest.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <KibanaContextProvider services={kibanaContextMock}>
        <AttacksVolumePanel filters={[]} query={undefined} />
      </KibanaContextProvider>
    );
  };

  it('renders the title', () => {
    renderComponent();
    expect(screen.getByText('Attacks volume over time')).toBeInTheDocument();
  });

  it('renders loading chart when loading', () => {
    mockUseAttacksVolumeData.mockReturnValue({
      items: [],
      isLoading: true,
      intervalMs: 1000,
      refetch: jest.fn(),
    });
    renderComponent();
    // EuiLoadingChart renders a div with specific class usually, or check absence of chart
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });

  it('renders line chart when data is present', () => {
    mockUseAttacksVolumeData.mockReturnValue({
      items: [{ x: 1600000000000, y: 5 }],
      isLoading: false,
      intervalMs: 1000,
      refetch: jest.fn(),
    });
    renderComponent();
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    expect(screen.getByTestId('mock-line-series')).toBeInTheDocument();
  });
});
