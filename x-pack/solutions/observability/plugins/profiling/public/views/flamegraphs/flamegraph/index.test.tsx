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
import type { AsyncState } from '../../../hooks/use_async';
import { AsyncStatus } from '../../../hooks/use_async';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { FlameGraphView } from '.';

const mockFetchElasticFlamechart = jest.fn().mockResolvedValue({});

jest.mock('@kbn/ebt-tools', () => ({ usePerformanceContext: () => ({ onPageReady: jest.fn() }) }));
jest.mock('../../../components/flamegraph', () => ({ FlameGraph: jest.fn(() => null) }));
jest.mock('../../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    services: { fetchElasticFlamechart: mockFetchElasticFlamechart },
    start: { core: { uiSettings: { get: () => false } } },
  }),
}));
jest.mock('../../../components/contexts/profiling_schema/use_profiling_schema', () => ({
  useProfilingSchema: () => ({ selectedSchema: 'otel' }),
}));
jest.mock('../../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now', kuery: '' } }),
}));
jest.mock('../../../hooks/use_profiling_route_path', () => ({
  useProfilingRoutePath: () => '/flamegraphs/flamegraph',
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

const mockFlamegraphState = (state: Partial<AsyncState<ElasticFlameGraph>>) =>
  jest.mocked(useTimeRangeAsync).mockReturnValue({
    status: AsyncStatus.Settled,
    refresh: jest.fn(),
    ...state,
  });

// Runs the request the view passes to `useTimeRangeAsync`
const requestFlamegraph = () => {
  const [[request]] = jest.mocked(useTimeRangeAsync).mock.calls;
  return request({ http: {} as Parameters<typeof request>[0]['http'] });
};

describe('FlameGraphView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the flamegraph of the selected schema', () => {
    mockFlamegraphState({ status: AsyncStatus.Loading });

    render(<FlameGraphView />);
    requestFlamegraph();

    expect(mockFetchElasticFlamechart).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL })
    );
  });

  it('prompts to change the search when the flamegraph has no samples', () => {
    mockFlamegraphState({ data: { TotalSamples: 0 } as ElasticFlameGraph });

    render(<FlameGraphView />);

    expect(screen.getByTestId('profilingNoDataPrompt')).toBeInTheDocument();
    expect(FlameGraph).not.toHaveBeenCalled();
  });

  it('renders the flamegraph when it has samples', () => {
    const data = { TotalSamples: 10 } as ElasticFlameGraph;
    mockFlamegraphState({ data });

    render(<FlameGraphView />);

    expect(FlameGraph).toHaveBeenCalledWith(
      expect.objectContaining({ primaryFlamegraph: data }),
      expect.anything()
    );
    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('does not prompt while the flamegraph is loading', () => {
    mockFlamegraphState({ status: AsyncStatus.Loading });

    render(<FlameGraphView />);

    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });
});
