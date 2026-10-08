/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { EnabledProfilingStatus } from '@kbn/profiling-utils';
import { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer';
import { useEnabledProfilingStatus } from '../../components/contexts/profiling_status/use_enabled_profiling_status';
import { TimeRangeContextProvider } from '../../components/contexts/time_range_context';
import { AsyncStatus } from '../../hooks/use_async';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { UniversalProfilingAddDataTabs } from '../add_data_view/universal_profiling/types';
import { StorageExplorerView } from '.';

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({ onPageReady: jest.fn() }),
}));
jest.mock('../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({ services: { fetchStorageExplorerSummary: jest.fn() } }),
}));
jest.mock('../../components/contexts/profiling_status/use_enabled_profiling_status');
jest.mock('../../components/profiling_app_page_template', () => ({
  ProfilingAppPageTemplate: ({ children }: React.PropsWithChildren) => (
    <div data-test-subj="storageExplorerPage">{children}</div>
  ),
}));
jest.mock('../../components/profiling_app_page_template/primary_profiling_search_bar', () => ({
  PrimaryProfilingSearchBar: () => null,
}));
jest.mock('../../hooks/use_profiling_params');
jest.mock('../../hooks/use_profiling_router');
jest.mock('../../hooks/use_time_range_async');
jest.mock('./index_lifecycle_phase_select', () => ({ IndexLifecyclePhaseSelect: () => null }));
jest.mock('./summary', () => ({ Summary: () => null }));
jest.mock('./host_breakdown', () => ({ HostBreakdown: () => null }));
jest.mock('./data_breakdown', () => ({ DataBreakdown: () => null }));

describe('StorageExplorerView', () => {
  const replace = jest.fn();

  const mockUniversalProfilingStatus = (
    universalProfiling: Partial<EnabledProfilingStatus['universalProfiling']>
  ) =>
    jest.mocked(useEnabledProfilingStatus).mockReturnValue({
      data: {
        isEnabled: true,
        otel: { isAvailable: true, hasData: true },
        universalProfiling: {
          isAvailable: true,
          hasSetup: true,
          hasData: true,
          hasLegacyData: false,
          ...universalProfiling,
        },
      },
      refresh: jest.fn(),
    });

  const renderView = () =>
    render(
      <TimeRangeContextProvider>
        <StorageExplorerView />
      </TimeRangeContextProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useProfilingRouter)
      .mockReturnValue({ replace } as unknown as ReturnType<typeof useProfilingRouter>);
    jest.mocked(useProfilingParams).mockReturnValue({
      path: {},
      query: {
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        kuery: 'host.name:my-host',
        indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
      },
    } as ReturnType<typeof useProfilingParams>);
    jest.mocked(useTimeRangeAsync).mockReturnValue({
      status: AsyncStatus.Loading,
      refresh: jest.fn(),
    });
  });

  it('renders Storage explorer when Universal Profiling is set up', () => {
    mockUniversalProfilingStatus({});

    const { getByTestId } = renderView();

    expect(getByTestId('storageExplorerPage')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to the setup when Universal Profiling is not set up', () => {
    mockUniversalProfilingStatus({ hasSetup: false, hasData: false });

    const { queryByTestId } = renderView();

    expect(replace).toHaveBeenCalledWith('/add-data-instructions', {
      path: {},
      query: { selectedTab: UniversalProfilingAddDataTabs.Kubernetes },
    });
    expect(queryByTestId('storageExplorerPage')).not.toBeInTheDocument();
    expect(useTimeRangeAsync).not.toHaveBeenCalled();
  });

  it('redirects to the profiling root when Universal Profiling is not available', () => {
    mockUniversalProfilingStatus({ isAvailable: false, hasSetup: false, hasData: false });

    const { queryByTestId } = renderView();

    expect(replace).toHaveBeenCalledWith('/', {
      path: {},
      query: { rangeFrom: 'now-1h', rangeTo: 'now', kuery: 'host.name:my-host' },
    });
    expect(queryByTestId('storageExplorerPage')).not.toBeInTheDocument();
    expect(useTimeRangeAsync).not.toHaveBeenCalled();
  });
});
