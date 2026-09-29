/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TestProviders } from '../../../../common/mock';
import { KPIsSection } from './kpis_section';
import type { KPIsSectionProps } from './kpis_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { KpiViewSelection } from './kpi_view_select/helpers';

vi.mock('./attacks_summary_panel', () => {
      const mocked = {
      AttacksSummaryPanel: ({
        title,
        setIsExpanded,
      }: {
        title: React.ReactNode;
        setIsExpanded: (val: boolean) => void;
      }) => (
        <div data-test-subj="mock-summary-view-content">
          {title}
          <button
            data-test-subj="query-toggle-header"
            onClick={() => setIsExpanded(false)}
            type="button"
          >
            {'Toggle'}
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./attacks_trends_panel', () => {
      const mocked = {
      AttacksTrendsPanel: ({ title }: { title: React.ReactNode }) => (
        <div data-test-subj="mock-trends-panel">{title}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./attacks_count_panel', () => {
      const mocked = {
      AttacksCountPanel: ({ title }: { title: React.ReactNode }) => (
        <div data-test-subj="mock-count-panel">{title}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./attacks_treemap_panel', () => {
      const mocked = {
      AttacksTreemapPanel: ({ title }: { title: React.ReactNode }) => (
        <div data-test-subj="mock-treemap-panel">{title}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/containers/query_toggle');

vi.mock('./common/use_attacks_kpi_state', () => {
      const mocked = {
      useAttacksKpiState: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockSetToggleStatus = vi.fn();
const mockUseQueryToggle = useQueryToggle as Mock;
const mockSetViewSelection = vi.fn();
const mockUseAttacksKpiState = useAttacksKpiState as Mock;

const defaultProps: KPIsSectionProps = {
  pageFilters: [],
  assignees: [],
  selectedConnectorNames: [],
  selectedTypes: [],
  dataView: {} as DataView,
};

describe('<KPIsSection />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
      setToggleStatus: mockSetToggleStatus,
    });
    mockUseAttacksKpiState.mockReturnValue({
      viewSelection: KpiViewSelection.Summary,
      setViewSelection: mockSetViewSelection,
    });
  });

  it('renders the section', () => {
    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-summary-view-content')).toBeInTheDocument();
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

  it('renders AttacksTrendsPanel when view is trend', () => {
    mockUseAttacksKpiState.mockReturnValue({
      viewSelection: KpiViewSelection.Trend,
      setViewSelection: mockSetViewSelection,
    });

    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-trends-panel')).toBeInTheDocument();
  });

  it('renders AttacksCountPanel when view is count', () => {
    mockUseAttacksKpiState.mockReturnValue({
      viewSelection: KpiViewSelection.Count,
      setViewSelection: mockSetViewSelection,
    });

    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-count-panel')).toBeInTheDocument();
  });

  it('renders AttacksTreemapPanel when view is treemap', () => {
    mockUseAttacksKpiState.mockReturnValue({
      viewSelection: KpiViewSelection.Treemap,
      setViewSelection: mockSetViewSelection,
    });

    render(
      <TestProviders>
        <KPIsSection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-treemap-panel')).toBeInTheDocument();
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
