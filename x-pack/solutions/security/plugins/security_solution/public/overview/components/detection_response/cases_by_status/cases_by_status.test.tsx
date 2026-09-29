/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { BarChartComponentProps } from '../../../../common/components/charts/barchart';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { TestProviders } from '../../../../common/mock';
import { CasesByStatus } from './cases_by_status';
vi.mock('../../../../common/components/link_to');
vi.mock('../../../../common/containers/query_toggle');
vi.mock('./use_cases_by_status', () => {
      const mocked = {
      useCasesByStatus: vi.fn().mockReturnValue({
        closed: 1,
        inProgress: 2,
        isLoading: false,
        open: 3,
        totalCounts: 6,
        updatedAt: new Date('2022-04-08T12:00:00.000Z').valueOf(),
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/lib/kibana', async () => {
  const actual = (await vi.importActual('../../../../common/lib/kibana'));
  return {
    ...actual,
    useNavigation: vi.fn().mockReturnValue({
      getAppUrl: vi.fn(),
      navigateTo: vi.fn(),
    }),
  };
});
vi.mock('../../../../common/components/charts/barchart', () => {
      const mocked = {
      BarChart: vi.fn((props: BarChartComponentProps) => <div data-test-subj="barChart" />),
    };
      return { ...mocked, default: mocked };
    });

const mockSetToggle = vi.fn();
(useQueryToggle as Mock).mockReturnValue({
  toggleStatus: true,
  setToggleStatus: mockSetToggle,
});

describe('CasesByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders title', () => {
    render(
      <TestProviders>
        <CasesByStatus />
      </TestProviders>
    );
    expect(screen.getByTestId('header-section-title')).toHaveTextContent('Cases');
  });

  test('renders toggleQuery', () => {
    render(
      <TestProviders>
        <CasesByStatus />
      </TestProviders>
    );
    expect(screen.getByTestId('query-toggle-header')).toBeInTheDocument();
  });

  test('renders BarChart', () => {
    render(
      <TestProviders>
        <CasesByStatus />
      </TestProviders>
    );
    expect(screen.getByTestId('chart-wrapper')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart-mask')).not.toBeInTheDocument();
  });

  test('collapses content', () => {
    (useQueryToggle as Mock).mockReturnValueOnce({
      toggleStatus: false,
      setToggleStatus: mockSetToggle,
    });
    render(
      <TestProviders>
        <CasesByStatus />
      </TestProviders>
    );

    expect(screen.queryByTestId('chart-wrapper')).not.toBeInTheDocument();
  });
});
