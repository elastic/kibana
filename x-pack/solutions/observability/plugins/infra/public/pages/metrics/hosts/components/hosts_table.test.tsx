/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { HostsTable } from './hosts_table';
import type { HostNodeRow } from '../hooks/use_hosts_table';
import { useHostsTableContext } from '../hooks/use_hosts_table';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { useHostCountContext } from '../hooks/use_host_count';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({ onPageReady: jest.fn() }),
}));
jest.mock('../hooks/use_hosts_table');
jest.mock('../hooks/use_hosts_view');
jest.mock('../hooks/use_host_count');
jest.mock('../hooks/use_unified_search');
jest.mock('../../../../hooks/use_time_range_metadata');
jest.mock('./host_details_flyout/flyout_wrapper', () => ({
  FlyoutWrapper: () => null,
}));

const mockUseHostsTableContext = useHostsTableContext as jest.MockedFunction<
  typeof useHostsTableContext
>;
const mockUseHostsViewContext = useHostsViewContext as jest.MockedFunction<
  typeof useHostsViewContext
>;
const mockUseHostCountContext = useHostCountContext as jest.MockedFunction<
  typeof useHostCountContext
>;
const mockUseUnifiedSearchContext = useUnifiedSearchContext as jest.MockedFunction<
  typeof useUnifiedSearchContext
>;
const mockUseTimeRangeMetadataContext = useTimeRangeMetadataContext as jest.MockedFunction<
  typeof useTimeRangeMetadataContext
>;

const hostRow = {
  id: 'host-0--',
  name: 'host-0',
  title: { name: 'host-0' },
  hasSystemMetrics: true,
} as HostNodeRow;

const tableContext = {
  columns: [{ field: 'name', name: 'Name' }],
  isFlyoutOpen: false,
  closeFlyout: jest.fn(),
  clickedItem: undefined,
  onTableChange: jest.fn(),
  pagination: { pageIndex: 0, pageSize: 10 },
  sorting: { field: 'name', direction: 'asc' as const },
  selection: { onSelectionChange: jest.fn() },
  selectedItemsCount: 0,
  filterSelectedHosts: jest.fn(),
};

const renderTable = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <HostsTable />
      </I18nProvider>
    </EuiProvider>
  );

describe('HostsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostsViewContext.mockReturnValue({
      loading: false,
    } as ReturnType<typeof useHostsViewContext>);
    mockUseHostCountContext.mockReturnValue({
      loading: false,
      count: 0,
    } as ReturnType<typeof useHostCountContext>);
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: {
        dateRange: { from: 'now-15m', to: 'now' },
        preferredSchema: 'ecs',
        limit: 100,
      },
    } as ReturnType<typeof useUnifiedSearchContext>);
    mockUseTimeRangeMetadataContext.mockReturnValue({
      data: { schemas: ['ecs'] },
    } as ReturnType<typeof useTimeRangeMetadataContext>);
  });

  it('shows the no-data prompt when a valid query matches no hosts', () => {
    mockUseHostsTableContext.mockReturnValue({
      ...tableContext,
      items: [],
      currentPage: [],
    } as unknown as ReturnType<typeof useHostsTableContext>);

    renderTable();

    expect(screen.getByTestId('hostsViewTableNoData')).toBeInTheDocument();
    expect(screen.getByText('There is no data to display.')).toBeInTheDocument();
  });

  it('does not show the no-data prompt when hosts are present', () => {
    mockUseHostsTableContext.mockReturnValue({
      ...tableContext,
      items: [hostRow],
      currentPage: [hostRow],
    } as unknown as ReturnType<typeof useHostsTableContext>);

    renderTable();

    expect(screen.queryByTestId('hostsViewTableNoData')).not.toBeInTheDocument();
    expect(screen.getByText('host-0')).toBeInTheDocument();
  });
});
