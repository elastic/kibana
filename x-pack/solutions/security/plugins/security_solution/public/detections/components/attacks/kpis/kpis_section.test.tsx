/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TestProviders } from '../../../../common/mock';
import { KPIsSection, KPIS_SECTION } from './kpis_section';
import type { KPIsSectionProps } from './kpis_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

jest.mock('./summary_view_content', () => ({
  SummaryViewContent: () => <div data-test-subj="mock-summary-view-content" />,
}));

jest.mock('../../../../common/containers/query_toggle');

const mockSetToggleStatus = jest.fn();
const mockUseQueryToggle = useQueryToggle as jest.Mock;

const defaultProps: KPIsSectionProps = {
  pageFilters: [],
  assignees: [],
  selectedConnectorNames: [],
  dataView: {} as DataView,
};

describe('<KPIsSection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
      setToggleStatus: mockSetToggleStatus,
    });
  });

  it('renders the section', () => {
    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId(KPIS_SECTION)).toBeInTheDocument();
  });

  it('shows view selector tabs when expanded', () => {
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
      setToggleStatus: mockSetToggleStatus,
    });

    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-view-select-tabs')).toBeInTheDocument();
  });

  it('renders SummaryViewContent when view is summary', () => {
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
      setToggleStatus: mockSetToggleStatus,
    });

    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-summary-view-content')).toBeInTheDocument();
  });

  it('shows collapsed label when collapsed', () => {
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: false,
      setToggleStatus: mockSetToggleStatus,
    });

    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-collapse-view-label')).toBeInTheDocument();
  });

  it('toggle button calls setToggleStatus when clicked', () => {
    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    const toggleButton = screen.getByTestId('query-toggle-header');
    fireEvent.click(toggleButton);

    expect(mockSetToggleStatus).toHaveBeenCalledWith(false);
  });
});
