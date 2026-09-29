/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { act, render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsSummaryChartsPanel } from '.';
import type { GroupBySelection } from '../alerts_progress_bar_panel/types';
import { useSummaryChartData } from './use_summary_chart_data';
import { useStackByFields } from '../common/hooks';

vi.mock('../../../../common/lib/kibana');
vi.mock('../../../../common/containers/query_toggle');
vi.mock('./use_summary_chart_data');
vi.mock('../common/hooks');

vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return { ...actual, useLocation: vi.fn().mockReturnValue({ pathname: '' }) };
});

vi.mock('../../../../common/components/cell_actions', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../common/components/cell_actions')),
    SecurityCellActions: vi.fn(() => <div data-test-subj="cell-actions-component" />),
  };
  return { ...mocked, default: mocked };
});

describe('AlertsSummaryChartsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSummaryChartData as Mock).mockReturnValue({
      items: [],
      isLoading: false,
    });
    (useStackByFields as Mock).mockReturnValue(vi.fn());
  });

  const mockSetIsExpanded = vi.fn();
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    isExpanded: true,
    setIsExpanded: mockSetIsExpanded,
    groupBySelection: 'host.name' as GroupBySelection,
    setGroupBySelection: vi.fn(),
  };

  test('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsSummaryChartsPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('alerts-charts-panel')).toBeInTheDocument();
  });

  test('it renders the header with the specified `alignHeader` alignment', () => {
    const { container } = render(
      <TestProviders>
        <AlertsSummaryChartsPanel {...defaultProps} alignHeader="flexEnd" />
      </TestProviders>
    );
    expect(
      container.querySelector('[data-test-subj="headerSectionInnerFlexGroup"]')?.classList[1]
    ).toContain('flexEnd');
  });

  describe('Query', () => {
    test('it render with a illegal KQL', () => {
      vi.doMock('@kbn/es-query', () => {
        const mocked = {
          buildEsQuery: vi.fn().mockImplementation(() => {
            throw new Error('Something went wrong');
          }),
        };
        return { ...mocked, default: mocked };
      });
      const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
      const { getByTestId } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...props} />
        </TestProviders>
      );

      expect(getByTestId('alerts-charts-panel')).toBeInTheDocument();
    });
  });

  describe('toggleQuery', () => {
    test('toggles', async () => {
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} />
        </TestProviders>
      );
      const element = container.querySelector('[data-test-subj="query-toggle-header"]');
      act(() => {
        if (element) {
          fireEvent.click(element);
        }
      });

      expect(mockSetIsExpanded).toHaveBeenCalledWith(false);
    });

    it('when isExpanded is true, render summary chart', () => {
      const { getByTestId } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} />
        </TestProviders>
      );
      expect(getByTestId('alerts-charts-container')).toBeInTheDocument();
    });

    it('when isExpanded is false, hide summary chart', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} isExpanded={false} />
        </TestProviders>
      );
      expect(queryByTestId('alerts-charts-container')).not.toBeInTheDocument();
    });
  });
});
