/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ElasticFlameGraph } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { FlameGraph } from '../../../components/flamegraph';
import { NO_BASELINE_DATA_TITLE } from '../../../components/no_profiling_data_prompt';
import type { AsyncState } from '../../../hooks/use_async';
import { AsyncStatus } from '../../../hooks/use_async';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { DifferentialFlameGraphsView } from '.';

const mockFetchElasticFlamechart = jest.fn().mockResolvedValue({});

jest.mock('@kbn/ebt-tools', () => ({ usePerformanceContext: () => ({ onPageReady: jest.fn() }) }));
jest.mock('../../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    services: { fetchElasticFlamechart: mockFetchElasticFlamechart, fetchTopNFunctions: jest.fn() },
    start: { core: { uiSettings: { get: () => false } } },
  }),
}));
jest.mock('../../../components/contexts/profiling_schema/use_profiling_schema', () => ({
  useProfilingSchema: () => ({ schema: 'otel' }),
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
jest.mock('../../../components/flamegraph', () => ({ FlameGraph: jest.fn(() => null) }));
jest.mock('../../../components/frames_summary', () => ({ FramesSummary: () => null }));
jest.mock('../../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: '',
      comparisonRangeFrom: 'now-30m',
      comparisonRangeTo: 'now-15m',
      comparisonKuery: '',
      comparisonMode: 'absolute',
      normalizationMode: 'time',
    },
  }),
}));

type DifferentialFlamegraphs = Record<
  'primaryFlamegraph' | 'comparisonFlamegraph',
  ElasticFlameGraph | undefined
>;

const createFlamegraph = (totalSamples: number) =>
  ({
    TotalSamples: totalSamples,
    TotalAnnualCO2KgsItems: [0],
    TotalAnnualCostsUSDItems: [0],
  } as unknown as ElasticFlameGraph);

const mockFlamegraphsState = (state: Partial<AsyncState<DifferentialFlamegraphs>>) =>
  jest.mocked(useTimeRangeAsync).mockReturnValue({
    status: AsyncStatus.Settled,
    refresh: jest.fn(),
    ...state,
  });

// Runs the request the view passes to `useTimeRangeAsync`
const requestFlamegraphs = () => {
  const [[request]] = jest.mocked(useTimeRangeAsync).mock.calls;
  return request({ http: {} as Parameters<typeof request>[0]['http'] });
};

describe('DifferentialFlameGraphsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the baseline and comparison flamegraphs of the selected schema', () => {
    mockFlamegraphsState({ status: AsyncStatus.Loading });

    render(<DifferentialFlameGraphsView />);
    requestFlamegraphs();

    expect(mockFetchElasticFlamechart).toHaveBeenCalledTimes(2);
    expect(mockFetchElasticFlamechart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ schema: ProfilingSchema.OTEL })
    );
    expect(mockFetchElasticFlamechart).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ schema: ProfilingSchema.OTEL })
    );
  });

  it('prompts to change the search when the baseline flamegraph has no samples', () => {
    mockFlamegraphsState({
      data: { primaryFlamegraph: createFlamegraph(0), comparisonFlamegraph: createFlamegraph(10) },
    });

    render(<DifferentialFlameGraphsView />);

    expect(screen.getByTestId('profilingNoDataPrompt')).toHaveTextContent(NO_BASELINE_DATA_TITLE);
    expect(FlameGraph).not.toHaveBeenCalled();
  });

  it('renders the flamegraphs when the baseline has samples, even if the comparison has none', () => {
    mockFlamegraphsState({
      data: { primaryFlamegraph: createFlamegraph(10), comparisonFlamegraph: createFlamegraph(0) },
    });

    render(<DifferentialFlameGraphsView />);

    expect(FlameGraph).toHaveBeenCalled();
    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('does not prompt while the flamegraphs are loading', () => {
    mockFlamegraphsState({ status: AsyncStatus.Loading });

    render(<DifferentialFlameGraphsView />);

    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });
});
