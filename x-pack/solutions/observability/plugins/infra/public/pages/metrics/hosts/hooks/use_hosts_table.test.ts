/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HostNodeRow, useHostsTable } from './use_hosts_table';
import { renderHook } from '@testing-library/react';
import type { InfraEntityMetricsItem } from '../../../../../common/http_api';
import * as useUnifiedSearchHooks from './use_unified_search';
import * as useHostsViewHooks from './use_hosts_view';
import * as useKibanaContextForPluginHook from '../../../../hooks/use_kibana';
import * as useMetricsDataViewHooks from '../../../../containers/metrics_source';
import * as useHostsTableUrlStateHooks from './use_hosts_table_url_state';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';

jest.mock('./use_unified_search');
jest.mock('./use_hosts_view');
jest.mock('../../../../containers/metrics_source');
jest.mock('../../../../hooks/use_kibana');
jest.mock('./use_hosts_table_url_state');
jest.mock('react-use/lib/useAsync', () => jest.fn(() => ({ value: undefined })));

const mockUseUnifiedSearchContext =
  useUnifiedSearchHooks.useUnifiedSearchContext as jest.MockedFunction<
    typeof useUnifiedSearchHooks.useUnifiedSearchContext
  >;
const mockUseHostsViewContext = useHostsViewHooks.useHostsViewContext as jest.MockedFunction<
  typeof useHostsViewHooks.useHostsViewContext
>;
const mockUseMetricsDataViewContext =
  useMetricsDataViewHooks.useMetricsDataViewContext as jest.MockedFunction<
    typeof useMetricsDataViewHooks.useMetricsDataViewContext
  >;

const mockUseKibanaContextForPlugin =
  useKibanaContextForPluginHook.useKibanaContextForPlugin as jest.MockedFunction<
    typeof useKibanaContextForPluginHook.useKibanaContextForPlugin
  >;
const mockUseHostsTableUrlState =
  useHostsTableUrlStateHooks.useHostsTableUrlState as jest.MockedFunction<
    typeof useHostsTableUrlStateHooks.useHostsTableUrlState
  >;
const setTableProperties = jest.fn();

const mockHostNode: InfraEntityMetricsItem[] = [
  {
    metrics: [
      {
        name: 'cpuV2',
        value: 0.6353277777777777,
      },
      {
        name: 'diskSpaceUsage',
        value: 0.2040001,
      },
      {
        name: 'memory',
        value: 0.94525,
      },
      {
        name: 'memoryFree',
        value: 34359.738368,
      },
      {
        name: 'normalizedLoad1m',
        value: 239.2040001,
      },
      {
        name: 'rx',
        value: 252456.92916666667,
      },
      {
        name: 'tx',
        value: 252758.425,
      },
    ],
    metadata: [
      { name: 'host.os.name', value: null },
      { name: 'cloud.provider', value: 'aws' },
    ],
    name: 'host-0',
    alertsCount: 0,
    hasSystemMetrics: true,
  },
  {
    metrics: [
      {
        name: 'cpuV2',
        value: 0.8647805555555556,
      },
      {
        name: 'diskSpaceUsage',
        value: 0.5400000214576721,
      },
      {
        name: 'memory',
        value: 0.5400000214576721,
      },
      {
        name: 'memoryFree',
        value: 9.194304,
      },
      {
        name: 'normalizedLoad1m',
        value: 100,
      },
      {
        name: 'rx',
        value: 95.86339715321859,
      },
      {
        name: 'tx',
        value: 110.38566859563191,
      },
    ],
    metadata: [
      { name: 'host.os.name', value: 'macOS' },
      { name: 'host.ip', value: '243.86.94.22' },
    ],
    name: 'host-1',
    alertsCount: 0,
    hasSystemMetrics: true,
  },
];

const mockKibanaServices = {
  telemetry: { reportHostEntryClicked: () => {} },
  data: {
    query: { filterManager: () => {} },
  },
};

describe('useHostTable hook', () => {
  beforeEach(() => {
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: {
        dateRange: { from: 'now-15m', to: 'now' },
        preferredSchema: 'ecs',
      },
    } as ReturnType<typeof useUnifiedSearchHooks.useUnifiedSearchContext>);

    mockUseHostsViewContext.mockReturnValue({
      hostNodes: mockHostNode,
    } as ReturnType<typeof useHostsViewHooks.useHostsViewContext>);

    mockUseMetricsDataViewContext.mockReturnValue({
      metricsView: {
        indices: 'metrics-*',
        fields: [],
        timeFieldName: TIMESTAMP_FIELD,
        dataViewReference: { id: 'default' } as DataView,
      },
      error: undefined,
      loading: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useMetricsDataViewHooks.useMetricsDataViewContext>);

    mockUseKibanaContextForPlugin.mockReturnValue({
      services: mockKibanaServices,
    } as unknown as ReturnType<typeof useKibanaContextForPluginHook.useKibanaContextForPlugin>);

    mockUseHostsTableUrlState.mockReturnValue([
      {
        detailsItemId: null,
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: { field: 'title', direction: 'asc' },
      },
      setTableProperties,
    ]);
  });
  it('it should map the nodes returned from the snapshot api to a format matching eui table items', () => {
    const expected: Array<Partial<HostNodeRow>> = [
      {
        name: 'host-0',
        os: '-',
        ip: '',
        id: 'host-0--',
        title: {
          cloudProvider: 'aws',
          name: 'host-0',
        },
        rx: 252456.92916666667,
        tx: 252758.425,
        memory: 0.94525,
        cpuV2: 0.6353277777777777,
        diskSpaceUsage: 0.2040001,
        memoryFree: 34359.738368,
        normalizedLoad1m: 239.2040001,
        alertsCount: 0,
        hasSystemMetrics: true,
      },
      {
        name: 'host-1',
        os: 'macOS',
        ip: '243.86.94.22',
        id: 'host-1-macOS',
        title: {
          cloudProvider: null,
          name: 'host-1',
        },
        rx: 95.86339715321859,
        tx: 110.38566859563191,
        memory: 0.5400000214576721,
        cpuV2: 0.8647805555555556,
        diskSpaceUsage: 0.5400000214576721,
        memoryFree: 9.194304,
        normalizedLoad1m: 100,
        alertsCount: 0,
        hasSystemMetrics: true,
      },
    ];

    const { result } = renderHook(() => useHostsTable());

    expect(result.current.items).toStrictEqual(expected);
  });

  it('shows network columns for ECS and hides them for semconv', () => {
    const { result, rerender } = renderHook(() => useHostsTable());
    const getColumnTestSubjects = () =>
      result.current.columns.flatMap((column) =>
        'data-test-subj' in column && column['data-test-subj'] ? [column['data-test-subj']] : []
      );

    expect(getColumnTestSubjects()).toEqual(
      expect.arrayContaining(['hostsView-tableRow-rx', 'hostsView-tableRow-tx'])
    );

    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: {
        dateRange: { from: 'now-15m', to: 'now' },
        preferredSchema: 'semconv',
      },
    } as ReturnType<typeof useUnifiedSearchHooks.useUnifiedSearchContext>);
    rerender();

    expect(getColumnTestSubjects()).not.toEqual(
      expect.arrayContaining(['hostsView-tableRow-rx', 'hostsView-tableRow-tx'])
    );
  });

  it.each([
    ['title', 'asc', ['host-0', 'host-1']],
    ['title', 'desc', ['host-1', 'host-0']],
    ['cpuV2', 'asc', ['host-0', 'host-1']],
    ['cpuV2', 'desc', ['host-1', 'host-0']],
  ] as const)('sorts the current page by %s %s', (field, direction, expectedNames) => {
    mockUseHostsTableUrlState.mockReturnValue([
      {
        detailsItemId: null,
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: { field, direction },
      },
      setTableProperties,
    ]);

    const { result } = renderHook(() => useHostsTable());

    expect(result.current.currentPage.map(({ name }) => name)).toEqual(expectedNames);
  });

  it.each([
    [0, 'host-0'],
    [1, 'host-1'],
  ] as const)('returns the expected row for page %s', (pageIndex, expectedName) => {
    mockUseHostsTableUrlState.mockReturnValue([
      {
        detailsItemId: null,
        pagination: { pageIndex, pageSize: 1 },
        sorting: { field: 'title', direction: 'asc' },
      },
      setTableProperties,
    ]);

    const { result } = renderHook(() => useHostsTable());

    expect(result.current.currentPage.map(({ name }) => name)).toEqual([expectedName]);
  });
});
