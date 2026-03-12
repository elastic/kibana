/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StackTraces } from '.';
import { StackTracesDisplayOption, TopNType } from '@kbn/profiling-utils';
import { AsyncStatus, type AsyncState } from '../../hooks/use_async';
import type { TopNSubchart } from '../../../common/topn';

// Mock child components
jest.mock('../stacked_bar_chart', () => ({
  StackedBarChart: ({ onClick }: { onClick?: (chart: TopNSubchart) => void }) => (
    <div data-test-subj="stackedBarChart">
      <button
        data-test-subj="mockChartClick"
        onClick={() =>
          onClick?.({
            Category: 'test-category',
            Label: 'Test Label',
            Percentage: 50,
            Series: [],
            Color: '#000000',
            Index: 0,
            Metadata: [],
          })
        }
      >
        Click Chart
      </button>
    </div>
  ),
}));

jest.mock('../chart_grid', () => ({
  ChartGrid: ({ onChartClick }: { onChartClick?: (chart: TopNSubchart) => void }) => (
    <div data-test-subj="chartGrid">
      <button
        data-test-subj="mockGridChartClick"
        onClick={() =>
          onChartClick?.({
            Category: 'grid-category',
            Label: 'Grid Label',
            Percentage: 30,
            Series: [],
            Color: '#FF0000',
            Index: 1,
            Metadata: [],
          })
        }
      >
        Click Grid Chart
      </button>
    </div>
  ),
}));

jest.mock('../subchart', () => ({
  SubChart: ({ category }: { category: string }) => (
    <div data-test-subj="subChart">SubChart: {category}</div>
  ),
}));

jest.mock('../async_component', () => {
  const { AsyncStatus: AsyncStatusEnum } = jest.requireActual<{ AsyncStatus: any }>(
    '../../hooks/use_async'
  );
  return {
    AsyncComponent: ({
      children,
      status,
      error,
    }: {
      children: React.ReactNode;
      status: keyof typeof AsyncStatusEnum;
      error?: Error;
      size: 'm' | 'l' | 'xl';
      style?: React.CSSProperties;
    }) => {
      if (status === AsyncStatusEnum.Loading) {
        return <div data-test-subj="loadingIndicator">Loading...</div>;
      }
      if (error) {
        return <div data-test-subj="errorIndicator">Error: {error.message}</div>;
      }
      return <>{children}</>;
    },
  };
});

const mockChart: TopNSubchart = {
  Category: 'test-category',
  Label: 'Test Label',
  Percentage: 50,
  Series: [
    { Timestamp: 1000, Count: 10, Percentage: 50 },
    { Timestamp: 2000, Count: 20, Percentage: 50 },
  ],
  Color: '#000000',
  Index: 0,
  Metadata: [],
};

const mockOtherChart: TopNSubchart = {
  Category: 'Other',
  Label: 'Other',
  Percentage: 30,
  Series: [],
  Color: '#CCCCCC',
  Index: 1,
  Metadata: [],
};

describe('StackTraces', () => {
  const defaultProps = {
    type: TopNType.Traces,
    displayOption: StackTracesDisplayOption.StackTraces,
    onChangeDisplayOption: jest.fn(),
    onStackedBarChartBrushEnd: jest.fn(),
    onChartClick: jest.fn(),
    limit: 10,
  };

  const createMockState = (
    status: AsyncStatus,
    data?: { charts: TopNSubchart[] },
    error?: Error
  ): AsyncState<{ charts: TopNSubchart[] }> => ({
    status,
    data,
    error,
    refresh: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('shows loading indicator when status is Loading', () => {
      const state = createMockState(AsyncStatus.Loading);
      render(<StackTraces {...defaultProps} state={state} />);

      const loadingIndicators = screen.getAllByTestId('loadingIndicator');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });

    it('shows loading indicator for both chart areas', () => {
      const state = createMockState(AsyncStatus.Loading);
      render(<StackTraces {...defaultProps} state={state} />);

      const loadingIndicators = screen.getAllByTestId('loadingIndicator');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Error state', () => {
    it('shows error indicator when state has error', () => {
      const state = createMockState(AsyncStatus.Settled, undefined, new Error('Test error'));
      render(<StackTraces {...defaultProps} state={state} />);

      const errorIndicators = screen.getAllByTestId('errorIndicator');
      expect(errorIndicators.length).toBeGreaterThan(0);
      const errorTexts = screen.getAllByText(/Error: Test error/);
      expect(errorTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Success state with data', () => {
    it('renders chart panel and chart grid when data is available', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} state={state} />);

      expect(screen.getByTestId('stackTracesChartPanel')).toBeInTheDocument();
      expect(screen.getByTestId('chartGrid')).toBeInTheDocument();
      expect(screen.getByTestId('stackedBarChart')).toBeInTheDocument();
    });

    it('displays correct top label with chart count', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart, mockOtherChart] });
      render(<StackTraces {...defaultProps} state={state} />);

      expect(screen.getByTestId('stackTracesTopLabel')).toHaveTextContent('Top 2');
    });

    it('displays correct top label when limit is applied', () => {
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart],
      });
      render(<StackTraces {...defaultProps} state={state} limit={1} />);

      expect(screen.getByTestId('stackTracesTopLabel')).toHaveTextContent('Top 1');
    });
  });

  describe('Empty data state', () => {
    it('renders with empty charts array', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [] });
      render(<StackTraces {...defaultProps} state={state} />);

      expect(screen.getByTestId('stackTracesChartPanel')).toBeInTheDocument();
      expect(screen.getByTestId('stackTracesTopLabel')).toHaveTextContent('Top 0');
    });
  });

  describe('Display options', () => {
    it('renders display option button group', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} state={state} />);

      expect(screen.getByTestId('stackTracesDisplayOptionButtonGroup')).toBeInTheDocument();
    });

    it('calls onChangeDisplayOption when display option is changed', async () => {
      const onChangeDisplayOption = jest.fn();
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(
        <StackTraces
          {...defaultProps}
          state={state}
          displayOption={StackTracesDisplayOption.StackTraces}
          onChangeDisplayOption={onChangeDisplayOption}
        />
      );

      const percentageButton = screen.getByRole('button', { name: /Percentages/i });
      await userEvent.click(percentageButton);

      expect(onChangeDisplayOption).toHaveBeenCalledWith(StackTracesDisplayOption.Percentage);
    });

    it('shows StackTraces option as selected by default', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(
        <StackTraces
          {...defaultProps}
          state={state}
          displayOption={StackTracesDisplayOption.StackTraces}
        />
      );

      const stackTracesButton = screen.getByRole('button', { name: /Stack traces/i });
      expect(stackTracesButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Type-specific behavior', () => {
    it('shows frames for Traces type', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Traces} state={state} />);

      expect(screen.getByTestId('stackedBarChart')).toBeInTheDocument();
    });

    it('does not show frames for Executables type', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Executables} state={state} />);

      expect(screen.getByTestId('stackedBarChart')).toBeInTheDocument();
    });
  });

  describe('Agent callout', () => {
    it('shows callout when Executables type has single "Other" chart', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockOtherChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Executables} state={state} />);

      expect(screen.getByTestId('stackTracesAgentCallout')).toBeInTheDocument();
      expect(screen.getByText(/No executable names available/)).toBeInTheDocument();
    });

    it('does not show callout when Executables type has multiple charts', () => {
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart],
      });
      render(<StackTraces {...defaultProps} type={TopNType.Executables} state={state} />);

      expect(screen.queryByTestId('stackTracesAgentCallout')).not.toBeInTheDocument();
    });

    it('does not show callout when Executables type has single non-"Other" chart', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Executables} state={state} />);

      expect(screen.queryByTestId('stackTracesAgentCallout')).not.toBeInTheDocument();
    });

    it('does not show callout for Traces type even with "Other" chart', () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockOtherChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Traces} state={state} />);

      expect(screen.queryByTestId('stackTracesAgentCallout')).not.toBeInTheDocument();
    });

    it('does not show callout when status is not Settled', () => {
      const state = createMockState(AsyncStatus.Loading, { charts: [mockOtherChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Executables} state={state} />);

      expect(screen.queryByTestId('stackTracesAgentCallout')).not.toBeInTheDocument();
    });
  });

  describe('Show more button', () => {
    it('shows "Show more" button when charts exceed limit and onShowMoreClick is provided', () => {
      const onShowMoreClick = jest.fn();
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart, mockChart, mockOtherChart],
      });
      render(
        <StackTraces {...defaultProps} state={state} limit={2} onShowMoreClick={onShowMoreClick} />
      );

      const showMoreButton = screen.getByTestId('profilingStackTracesViewShowMoreButton');
      expect(showMoreButton).toBeInTheDocument();
      expect(showMoreButton).toHaveTextContent('Show more');
    });

    it('does not show "Show more" button when charts do not exceed limit', () => {
      const onShowMoreClick = jest.fn();
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(
        <StackTraces {...defaultProps} state={state} limit={10} onShowMoreClick={onShowMoreClick} />
      );

      expect(
        screen.queryByTestId('profilingStackTracesViewShowMoreButton')
      ).not.toBeInTheDocument();
    });

    it('does not show "Show more" button when onShowMoreClick is not provided', () => {
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart, mockChart],
      });
      render(<StackTraces {...defaultProps} state={state} limit={2} />);

      expect(
        screen.queryByTestId('profilingStackTracesViewShowMoreButton')
      ).not.toBeInTheDocument();
    });

    it('calls onShowMoreClick with increased limit when button is clicked', async () => {
      const onShowMoreClick = jest.fn();
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart, mockChart],
      });
      render(
        <StackTraces {...defaultProps} state={state} limit={2} onShowMoreClick={onShowMoreClick} />
      );

      const showMoreButton = screen.getByTestId('profilingStackTracesViewShowMoreButton');
      await userEvent.click(showMoreButton);

      expect(onShowMoreClick).toHaveBeenCalledWith(12);
    });
  });

  describe('Chart clicking behavior', () => {
    it('opens flyout when clicking chart in Traces type', async () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Traces} state={state} />);

      const chartClickButton = screen.getByTestId('mockChartClick');
      await userEvent.click(chartClickButton);

      await waitFor(() => {
        expect(screen.getByTestId('stackTracesFlyout')).toBeInTheDocument();
      });
      expect(screen.getByTestId('subChart')).toBeInTheDocument();
      expect(screen.getByText(/SubChart: test-category/)).toBeInTheDocument();
    });

    it('calls onChartClick when clicking chart in non-Traces type', async () => {
      const onChartClick = jest.fn();
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(
        <StackTraces
          {...defaultProps}
          type={TopNType.Executables}
          state={state}
          onChartClick={onChartClick}
        />
      );

      const chartClickButton = screen.getByTestId('mockChartClick');
      await userEvent.click(chartClickButton);

      expect(onChartClick).toHaveBeenCalledWith('test-category');
      expect(screen.queryByTestId('stackTracesFlyout')).not.toBeInTheDocument();
    });

    it('calls onChartClick when clicking grid chart in non-Traces type', async () => {
      const onChartClick = jest.fn();
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(
        <StackTraces
          {...defaultProps}
          type={TopNType.Executables}
          state={state}
          onChartClick={onChartClick}
        />
      );

      const gridChartClickButton = screen.getByTestId('mockGridChartClick');
      await userEvent.click(gridChartClickButton);

      expect(onChartClick).toHaveBeenCalledWith('grid-category');
    });

    it('opens flyout when clicking grid chart in Traces type', async () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Traces} state={state} />);

      const gridChartClickButton = screen.getByTestId('mockGridChartClick');
      await userEvent.click(gridChartClickButton);

      await waitFor(() => {
        expect(screen.getByTestId('stackTracesFlyout')).toBeInTheDocument();
      });
      expect(screen.getByText(/SubChart: grid-category/)).toBeInTheDocument();
    });
  });

  describe('Flyout behavior', () => {
    it('closes flyout when onClose is called', async () => {
      const state = createMockState(AsyncStatus.Settled, { charts: [mockChart] });
      render(<StackTraces {...defaultProps} type={TopNType.Traces} state={state} />);

      // Open flyout
      const chartClickButton = screen.getByTestId('mockChartClick');
      await userEvent.click(chartClickButton);

      await waitFor(() => {
        expect(screen.getByTestId('stackTracesFlyout')).toBeInTheDocument();
      });

      // Close flyout - EuiFlyout has a close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('stackTracesFlyout')).not.toBeInTheDocument();
      });
    });
  });

  describe('Top label calculation', () => {
    it('shows total chart count when onShowMoreClick is provided', () => {
      const onShowMoreClick = jest.fn();
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart, mockChart],
      });
      render(
        <StackTraces {...defaultProps} state={state} limit={2} onShowMoreClick={onShowMoreClick} />
      );

      expect(screen.getByTestId('stackTracesTopLabel')).toHaveTextContent('Top 3');
    });

    it('shows min of limit and chart count when onShowMoreClick is not provided', () => {
      const state = createMockState(AsyncStatus.Settled, {
        charts: [mockChart, mockOtherChart, mockChart],
      });
      render(<StackTraces {...defaultProps} state={state} limit={2} />);

      expect(screen.getByTestId('stackTracesTopLabel')).toHaveTextContent('Top 2');
    });
  });
});
