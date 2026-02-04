/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { KpiViewSelect } from './kpi_view_select';
import { KpiViewSelection } from './helpers';

describe('<KpiViewSelect />', () => {
  const mockSetKpiViewSelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the view selector with all tabs', () => {
    render(
      <TestProviders>
        <KpiViewSelect
          kpiViewSelection={KpiViewSelection.Summary}
          setKpiViewSelection={mockSetKpiViewSelection}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-view-select-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-view-select-summary')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-view-select-trend')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-view-select-count')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-view-select-treemap')).toBeInTheDocument();
  });

  it('marks the selected view with aria-pressed', () => {
    render(
      <TestProviders>
        <KpiViewSelect
          kpiViewSelection={KpiViewSelection.Trend}
          setKpiViewSelection={mockSetKpiViewSelection}
        />
      </TestProviders>
    );

    const trendButton = screen.getByTestId('kpi-view-select-trend');
    expect(trendButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls setKpiViewSelection when a different view is clicked', () => {
    render(
      <TestProviders>
        <KpiViewSelect
          kpiViewSelection={KpiViewSelection.Summary}
          setKpiViewSelection={mockSetKpiViewSelection}
        />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('kpi-view-select-count'));

    expect(mockSetKpiViewSelection).toHaveBeenCalledWith(KpiViewSelection.Count);
  });

  it('calls setKpiViewSelection with treemap when treemap tab is clicked', () => {
    render(
      <TestProviders>
        <KpiViewSelect
          kpiViewSelection={KpiViewSelection.Summary}
          setKpiViewSelection={mockSetKpiViewSelection}
        />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('kpi-view-select-treemap'));

    expect(mockSetKpiViewSelection).toHaveBeenCalledWith(KpiViewSelection.Treemap);
  });
});
