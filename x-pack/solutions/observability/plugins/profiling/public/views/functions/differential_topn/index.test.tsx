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
import { DifferentialTopNFunctionsGrid } from '../../../components/differential_topn_functions_grid';
import { NO_BASELINE_DATA_TITLE } from '../../../components/no_profiling_data_prompt';
import type { AsyncState } from '../../../hooks/use_async';
import { AsyncStatus } from '../../../hooks/use_async';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { DifferentialTopNFunctionsView } from '.';

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
jest.mock('../../../components/differential_topn_functions_grid', () => ({
  DifferentialTopNFunctionsGrid: jest.fn(() => null),
}));
jest.mock('../../../components/frames_summary', () => ({ FramesSummary: () => null }));
jest.mock('../../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: '',
      sortField: 'rank',
      sortDirection: 'asc',
      comparisonRangeFrom: 'now-30m',
      comparisonRangeTo: 'now-15m',
      comparisonKuery: '',
      normalizationMode: 'time',
      comparisonSortField: 'comparison_rank',
      comparisonSortDirection: 'asc',
    },
  }),
}));

const createTopNFunctions = (functionIds: string[]) =>
  ({ TopN: functionIds.map((Id) => ({ Id })) } as unknown as TopNFunctions);

// The baseline and comparison functions are fetched in this order on every render.
const mockTopNFunctionsStates = (
  baseline: Partial<AsyncState<TopNFunctions>>,
  comparison: Partial<AsyncState<TopNFunctions>>
) => {
  let call = 0;
  jest.mocked(useTimeRangeAsync).mockImplementation(() => ({
    status: AsyncStatus.Settled,
    refresh: jest.fn(),
    ...(call++ % 2 === 0 ? baseline : comparison),
  }));
};

// Runs the baseline and comparison requests the view passes to `useTimeRangeAsync`
const requestTopNFunctions = () => {
  const [[baselineRequest], [comparisonRequest]] = jest.mocked(useTimeRangeAsync).mock.calls;
  const http = {} as Parameters<typeof baselineRequest>[0]['http'];
  return [baselineRequest({ http }), comparisonRequest({ http })];
};

describe('DifferentialTopNFunctionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the baseline and comparison functions of the selected schema', () => {
    mockTopNFunctionsStates({ status: AsyncStatus.Loading }, { status: AsyncStatus.Loading });

    render(<DifferentialTopNFunctionsView />);
    requestTopNFunctions();

    expect(mockFetchTopNFunctions).toHaveBeenCalledTimes(2);
    expect(mockFetchTopNFunctions).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ schema: ProfilingSchema.OTEL })
    );
    expect(mockFetchTopNFunctions).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ schema: ProfilingSchema.OTEL })
    );
  });

  it('prompts to change the search when there are no baseline functions', () => {
    mockTopNFunctionsStates(
      { data: createTopNFunctions([]) },
      { data: createTopNFunctions(['main']) }
    );

    render(<DifferentialTopNFunctionsView />);

    expect(screen.getByTestId('profilingNoDataPrompt')).toHaveTextContent(NO_BASELINE_DATA_TITLE);
    expect(DifferentialTopNFunctionsGrid).not.toHaveBeenCalled();
  });

  it('renders the functions when the baseline has some, even if the comparison has none', () => {
    mockTopNFunctionsStates(
      { data: createTopNFunctions(['main']) },
      { data: createTopNFunctions([]) }
    );

    render(<DifferentialTopNFunctionsView />);

    expect(DifferentialTopNFunctionsGrid).toHaveBeenCalled();
    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('does not prompt while the baseline functions are loading', () => {
    mockTopNFunctionsStates({ status: AsyncStatus.Loading }, { status: AsyncStatus.Loading });

    render(<DifferentialTopNFunctionsView />);

    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });
});
