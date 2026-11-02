/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LastResponseSummaryChart } from './last_response_summary_chart';
import { useGetSpaceHealth } from '../../api/hooks/use_get_space_health';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRulesTableContextMock } from '../../../rule_management_ui/components/rules_table/rules_table/__mocks__/rules_table_context';

jest.mock('../../api/hooks/use_get_space_health');
jest.mock('../../../rule_management_ui/components/rules_table/rules_table/rules_table_context');
jest.mock('../../../../common/components/charts/donutchart', () => ({
  DonutChart: jest.fn(() => <div data-test-subj="mock-donut-chart" />),
}));

const mockUseGetSpaceHealth = useGetSpaceHealth as jest.Mock;
const mockInvalidate = jest.fn();
jest.mock('../../api/hooks/use_get_space_health', () => ({
  useGetSpaceHealth: jest.fn(),
  useInvalidateGetSpaceHealthQuery: () => mockInvalidate,
}));

const createSpaceHealthResponse = ({
  succeeded = 0,
  warning = 0,
  failed = 0,
  total = 0,
}: {
  succeeded?: number;
  warning?: number;
  failed?: number;
  total?: number;
}) => ({
  health: {
    state_at_the_moment: {
      number_of_rules: {
        all: { total },
        by_outcome: {
          succeeded: { total: succeeded },
          warning: { total: warning },
          failed: { total: failed },
        },
      },
    },
  },
});

describe('LastResponseSummaryChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRulesTableContext as jest.Mock).mockReturnValue(useRulesTableContextMock.create());
  });

  it('renders a loading spinner when data is loading', () => {
    mockUseGetSpaceHealth.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    render(<LastResponseSummaryChart />);

    expect(screen.getByTestId('last-response-summary-chart')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error callout when the request fails', () => {
    mockUseGetSpaceHealth.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    });

    render(<LastResponseSummaryChart />);

    expect(screen.getByTestId('last-response-summary-error')).toBeInTheDocument();
  });

  it('renders correct counts from the space health response', () => {
    mockUseGetSpaceHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: createSpaceHealthResponse({
        succeeded: 5,
        warning: 2,
        failed: 1,
        total: 10,
      }),
    });

    render(<LastResponseSummaryChart />);

    const table = screen.getByTestId('last-response-summary-table');

    expect(table).toHaveTextContent('Succeeded');
    expect(table).toHaveTextContent('5');

    expect(table).toHaveTextContent('Warning');
    expect(table).toHaveTextContent('2');

    expect(table).toHaveTextContent('Failed');
    expect(table).toHaveTextContent('1');

    expect(table).toHaveTextContent('No response');
    expect(table).toHaveTextContent('2');
  });

  it('computes "No response" as total minus succeeded, warning, and failed', () => {
    mockUseGetSpaceHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: createSpaceHealthResponse({
        succeeded: 3,
        warning: 0,
        failed: 0,
        total: 10,
      }),
    });

    render(<LastResponseSummaryChart />);

    const table = screen.getByTestId('last-response-summary-table');
    const rows = table.querySelectorAll('tr');
    const noResponseRow = Array.from(rows).find((row) => row.textContent?.includes('No response'));
    expect(noResponseRow).toHaveTextContent('7');
  });

  it('renders all counts as zero when all outcome totals are zero', () => {
    mockUseGetSpaceHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: createSpaceHealthResponse({
        succeeded: 0,
        warning: 0,
        failed: 0,
        total: 0,
      }),
    });

    render(<LastResponseSummaryChart />);

    const table = screen.getByTestId('last-response-summary-table');
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      expect(row).toHaveTextContent('0');
    });
  });

  it('handles missing by_outcome data gracefully', () => {
    mockUseGetSpaceHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        health: {
          state_at_the_moment: {
            number_of_rules: {
              all: { total: 5 },
              by_outcome: {},
            },
          },
        },
      },
    });

    render(<LastResponseSummaryChart />);

    const table = screen.getByTestId('last-response-summary-table');
    const noResponseRow = Array.from(table.querySelectorAll('tr')).find((row) =>
      row.textContent?.includes('No response')
    );
    expect(noResponseRow).toHaveTextContent('5');
  });
});
