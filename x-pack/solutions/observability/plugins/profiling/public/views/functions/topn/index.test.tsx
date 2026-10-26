/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { TopNFunctionsGrid } from '../../../components/topn_functions';
import type { AsyncState } from '../../../hooks/use_async';
import { AsyncStatus } from '../../../hooks/use_async';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { TopNFunctionsView } from '.';

const mockFetchTopNFunctions = jest.fn().mockResolvedValue({});

jest.mock('@kbn/ebt-tools', () => ({ usePerformanceContext: () => ({ onPageReady: jest.fn() }) }));
jest.mock('../../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    services: { fetchElasticFlamechart: jest.fn(), fetchTopNFunctions: mockFetchTopNFunctions },
    start: { core: { uiSettings: { get: () => false } } },
  }),
}));
jest.mock('../../../components/contexts/profiling_schema/use_profiling_schema', () => ({
  useProfilingSchema: () => ({ selectedSchema: 'otel' }),
}));
jest.mock('../../../hooks/use_profiling_route_path', () => ({
  useProfilingRoutePath: () => '/',
}));
jest.mock('../../../hooks/use_profiling_router', () => ({
  useProfilingRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2023-04-18T00:00:00.000Z',
    end: '2023-04-18T00:15:00.000Z',
    inSeconds: { start: 1681776000, end: 1681776900 },
  }),
}));
jest.mock('../../../hooks/use_time_range_async');
jest.mock('../../../components/topn_functions', () => ({ TopNFunctionsGrid: jest.fn(() => null) }));
jest.mock('../../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: '',
      sortField: 'rank',
      sortDirection: 'asc',
    },
  }),
}));

const mockTopNFunctionsState = (state: Partial<AsyncState<TopNFunctions>>) =>
  jest.mocked(useTimeRangeAsync).mockReturnValue({
    status: AsyncStatus.Settled,
    refresh: jest.fn(),
    ...state,
  });

// Runs the request the view passes to `useTimeRangeAsync`
const requestTopNFunctions = () => {
  const [[request]] = jest.mocked(useTimeRangeAsync).mock.calls;
  return request({ http: {} as Parameters<typeof request>[0]['http'] });
};

describe('TopNFunctionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the functions of the selected schema', () => {
    mockTopNFunctionsState({ status: AsyncStatus.Loading });

    render(<TopNFunctionsView />);
    requestTopNFunctions();

    expect(mockFetchTopNFunctions).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL })
    );
  });

  it('prompts to change the search when there are no functions', () => {
    mockTopNFunctionsState({ data: { TopN: [] } as unknown as TopNFunctions });

    render(<TopNFunctionsView />);

    expect(screen.getByTestId('profilingNoDataPrompt')).toBeInTheDocument();
    expect(TopNFunctionsGrid).not.toHaveBeenCalled();
  });

  it('renders the functions when there are some', () => {
    const data = { TopN: [{ Id: 'main' }] } as unknown as TopNFunctions;
    mockTopNFunctionsState({ data });

    render(<TopNFunctionsView />);

    expect(TopNFunctionsGrid).toHaveBeenCalledWith(
      expect.objectContaining({ topNFunctions: data }),
      expect.anything()
    );
    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('does not prompt while the functions are loading', () => {
    mockTopNFunctionsState({ status: AsyncStatus.Loading });

    render(<TopNFunctionsView />);

    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });
});
