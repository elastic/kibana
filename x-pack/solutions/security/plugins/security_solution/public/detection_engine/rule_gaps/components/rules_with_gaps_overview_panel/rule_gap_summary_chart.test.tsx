/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleGapSummaryChart } from './rule_gap_summary_chart';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRulesTableContextMock } from '../../../rule_management_ui/components/rules_table/rules_table/__mocks__/rules_table_context';
import { useGapAutoFillSchedulerContext } from '../../context/gap_auto_fill_scheduler_context';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../rule_management_ui/components/rules_table/rules_table/rules_table_context');
jest.mock('../../context/gap_auto_fill_scheduler_context');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/charts/donutchart', () => ({
  DonutChart: jest.fn(() => <div data-test-subj="mock-donut-chart" />),
}));

const mockUseGetRuleIdsWithGaps = useGetRuleIdsWithGaps as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockInvalidate = jest.fn();
jest.mock('../../api/hooks/use_get_rule_ids_with_gaps', () => ({
  useGetRuleIdsWithGaps: jest.fn(),
  useInvalidateGetRuleIdsWithGapsQuery: () => mockInvalidate,
}));

const createGapsResponse = ({
  filled = 0,
  inProgress = 0,
  unfilled = 0,
  error = 0,
  totalFilledDurationMs = 0,
  totalInProgressDurationMs = 0,
  totalUnfilledDurationMs = 0,
  totalErrorDurationMs = 0,
  totalDurationMs = 0,
}: {
  filled?: number;
  inProgress?: number;
  unfilled?: number;
  error?: number;
  totalFilledDurationMs?: number;
  totalInProgressDurationMs?: number;
  totalUnfilledDurationMs?: number;
  totalErrorDurationMs?: number;
  totalDurationMs?: number;
}) => ({
  summary: {
    rules_by_gap_fill_status: {
      filled,
      in_progress: inProgress,
      unfilled,
      error,
    },
    total_filled_duration_ms: totalFilledDurationMs,
    total_in_progress_duration_ms: totalInProgressDurationMs,
    total_unfilled_duration_ms: totalUnfilledDurationMs,
    total_error_duration_ms: totalErrorDurationMs,
    total_duration_ms: totalDurationMs,
  },
});

describe('RuleGapSummaryChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn().mockReturnValue([]),
        },
      },
    });
    (useRulesTableContext as jest.Mock).mockReturnValue(useRulesTableContextMock.create());
    (useGapAutoFillSchedulerContext as jest.Mock).mockReturnValue({
      canAccessGapAutoFill: false,
      canEditGapAutoFill: false,
      hasEnterpriseLicense: false,
      scheduler: undefined,
      isSchedulerLoading: false,
      isSchedulerFetching: false,
      hasErrors: false,
      latestErrorTimestamp: undefined,
      totalErrors: 0,
    });
  });

  it('renders a loading spinner when data is loading', () => {
    mockUseGetRuleIdsWithGaps.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    render(<RuleGapSummaryChart />);

    expect(screen.getByTestId('rule-gap-summary-chart')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error callout when the request fails', () => {
    mockUseGetRuleIdsWithGaps.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    });

    render(<RuleGapSummaryChart />);

    expect(screen.getByTestId('rule-gap-summary-error')).toBeInTheDocument();
  });

  it('renders humanized durations for each gap status', () => {
    mockUseGetRuleIdsWithGaps.mockReturnValue({
      isLoading: false,
      isError: false,
      data: createGapsResponse({
        filled: 1,
        inProgress: 1,
        unfilled: 1,
        totalFilledDurationMs: 3600000,
        totalInProgressDurationMs: 1800000,
        totalUnfilledDurationMs: 300000,
        totalDurationMs: 5700000,
      }),
    });

    render(<RuleGapSummaryChart />);

    const table = screen.getByTestId('rule-gap-summary-table');
    const rows = table.querySelectorAll('tbody tr');

    const filledRow = Array.from(rows).find((row) => row.textContent?.includes('Filled'));
    expect(filledRow).toHaveTextContent('an hour');

    const inProgressRow = Array.from(rows).find((row) => row.textContent?.includes('In progress'));
    expect(inProgressRow).toHaveTextContent('30 minutes');

    const unfilledRow = Array.from(rows).find((row) => row.textContent?.includes('Unfilled'));
    expect(unfilledRow).toHaveTextContent('5 minutes');
  });

  it('renders "0" duration when duration is zero', () => {
    mockUseGetRuleIdsWithGaps.mockReturnValue({
      isLoading: false,
      isError: false,
      data: createGapsResponse({
        filled: 0,
        inProgress: 0,
        unfilled: 0,
        totalFilledDurationMs: 0,
        totalInProgressDurationMs: 0,
        totalUnfilledDurationMs: 0,
        totalDurationMs: 0,
      }),
    });

    render(<RuleGapSummaryChart />);

    const table = screen.getByTestId('rule-gap-summary-table');
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      const durationCell = cells[cells.length - 1];
      expect(durationCell).toHaveTextContent('0');
    });
  });

  it('renders empty table when summary data is missing', () => {
    mockUseGetRuleIdsWithGaps.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {},
    });

    render(<RuleGapSummaryChart />);

    const table = screen.getByTestId('rule-gap-summary-table');
    expect(table).toHaveTextContent('No items found');
  });
});
