/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { Chart } from './chart';
import * as useUnifiedSearchHooks from '../../../hooks/use_unified_search';
import * as useHostsTableHooks from '../../../hooks/use_hosts_table';
import * as useAfterLoadedStateHooks from '../../../hooks/use_after_loaded_state';
import { useReloadRequestTimeContext } from '../../../../../../hooks/use_reload_request_time';

jest.mock('../../../hooks/use_hosts_view', () => ({
  ...jest.requireActual('../../../hooks/use_hosts_view'),
  useHostsViewContext: jest.fn(),
}));
jest.mock('../../../hooks/use_unified_search');
jest.mock('../../../hooks/use_hosts_table');
jest.mock('../../../hooks/use_after_loaded_state');
jest.mock('../../../../../../hooks/use_reload_request_time');
jest.mock('../../../../../../components/lens', () => ({
  LensChart: () => <div data-test-subj="lensChart">LensChart</div>,
}));

// Import after mocking
import { useHostsViewContext } from '../../../hooks/use_hosts_view';

const mockUseHostsViewContext = useHostsViewContext as jest.MockedFunction<
  typeof useHostsViewContext
>;
const mockUseUnifiedSearchContext =
  useUnifiedSearchHooks.useUnifiedSearchContext as jest.MockedFunction<
    typeof useUnifiedSearchHooks.useUnifiedSearchContext
  >;
const mockUseHostsTableContext = useHostsTableHooks.useHostsTableContext as jest.MockedFunction<
  typeof useHostsTableHooks.useHostsTableContext
>;
const mockUseAfterLoadedState = useAfterLoadedStateHooks.useAfterLoadedState as jest.MockedFunction<
  typeof useAfterLoadedStateHooks.useAfterLoadedState
>;
const mockUseReloadRequestTimeContext = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;

const renderChart = async () => {
  const result = render(
    <I18nProvider>
      <Chart
        id="test-chart"
        dataView={{ id: 'test-data-view' } as Parameters<typeof Chart>[0]['dataView']}
        chartType="xy"
        title="Test Chart"
        layers={[]}
      />
    </I18nProvider>
  );
  // Wait for async state updates to complete
  await waitFor(() => {});
  return result;
};

describe('Chart', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: {
        dateRange: { from: 'now-15m', to: 'now' },
        filters: [],
        panelFilters: [],
        query: { query: '', language: 'kuery' },
      },
    } as unknown as ReturnType<typeof useUnifiedSearchHooks.useUnifiedSearchContext>);

    mockUseReloadRequestTimeContext.mockReturnValue({
      reloadRequestTime: 0,
      updateReloadRequestTime: jest.fn(),
    });

    mockUseHostsTableContext.mockReturnValue({
      currentPage: [],
    } as unknown as ReturnType<typeof useHostsTableHooks.useHostsTableContext>);

    mockUseAfterLoadedState.mockReturnValue({
      afterLoadedState: {
        dateRange: { from: 'now-15m', to: 'now' },
        query: undefined,
        reloadRequestTime: 0,
      },
    } as unknown as ReturnType<typeof useAfterLoadedStateHooks.useAfterLoadedState>);
  });

  describe('when there is an error', () => {
    it('should render ChartPlaceholder with error state', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      await renderChart();

      expect(screen.getByText('API error')).toBeInTheDocument();
      expect(screen.queryByTestId('lensChart')).not.toBeInTheDocument();
    });

    it('should render ChartPlaceholder when error exists even with hosts', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [{ name: 'host-1' }, { name: 'host-2' }],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      await renderChart();

      expect(screen.getByText('API error')).toBeInTheDocument();
      expect(screen.queryByTestId('lensChart')).not.toBeInTheDocument();
    });

    it('should display error message body for error state', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      await renderChart();

      expect(screen.getByText('API error')).toBeInTheDocument();
    });
  });

  describe('when there is no data', () => {
    it('should render ChartPlaceholder with no data state when not loading and no hosts', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: undefined,
      });

      await renderChart();

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.queryByTestId('lensChart')).not.toBeInTheDocument();
    });
  });

  describe('when loading', () => {
    it('should render LensChart when loading even with no hosts', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: true,
        error: undefined,
      });

      await renderChart();

      expect(screen.getByTestId('lensChart')).toBeInTheDocument();
    });
  });

  describe('when data is available', () => {
    it('should render LensChart when hosts are loaded successfully', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [{ name: 'host-1' }, { name: 'host-2' }],
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      await renderChart();

      expect(screen.getByTestId('lensChart')).toBeInTheDocument();
      expect(screen.queryByText('API error')).not.toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });

    it('should render LensChart when loading with existing hosts', async () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [{ name: 'host-1' }],
        loading: true,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      await renderChart();

      expect(screen.getByTestId('lensChart')).toBeInTheDocument();
    });
  });
});
