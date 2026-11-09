/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfilingSchema, TopNType } from '@kbn/profiling-utils';
import type { TopNSubchart } from '../../../common/topn';
import { StackTraces } from '../../components/stack_traces';
import type { AsyncState } from '../../hooks/use_async';
import { AsyncStatus } from '../../hooks/use_async';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { StackTracesView } from '.';

const mockFetchTopN = jest
  .fn()
  .mockResolvedValue({ TotalCount: 0, TopN: [], Metadata: {}, Labels: {} });
let mockSchema: ProfilingSchema | undefined;

jest.mock('@kbn/ebt-tools', () => ({ usePerformanceContext: () => ({ onPageReady: jest.fn() }) }));
jest.mock('../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({ services: { fetchTopN: mockFetchTopN } }),
}));
// Like the actual page template, provides the selected schema to its content
jest.mock('../../components/profiling_app_page_template', () => {
  const { createElement } = jest.requireActual('react');
  const { ProfilingSchemaContext } = jest.requireActual(
    '../../components/contexts/profiling_schema/profiling_schema_context'
  );
  return {
    ProfilingAppPageTemplate: ({ children }: { children: React.ReactElement }) =>
      createElement(
        ProfilingSchemaContext.Provider,
        { value: { selectedSchema: mockSchema } },
        children
      ),
  };
});
jest.mock('../../routing/route_breadcrumb', () => ({
  RouteBreadcrumb: ({ children }: { children: React.ReactElement }) => children,
}));
jest.mock('../../components/stack_traces', () => ({ StackTraces: jest.fn(() => null) }));
jest.mock('../../hooks/use_profiling_route_path', () => ({
  useProfilingRoutePath: () => '/stacktraces/{topNType}',
}));
jest.mock('../../hooks/use_profiling_router', () => ({
  useProfilingRouter: () => ({ push: jest.fn(), link: () => '/app/profiling/stacktraces' }),
}));
jest.mock('../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({
    path: { topNType: 'hosts' },
    query: { rangeFrom: 'now-15m', rangeTo: 'now', kuery: '' },
  }),
}));
jest.mock('../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2023-04-18T00:00:00.000Z',
    end: '2023-04-18T00:15:00.000Z',
    inSeconds: { start: 1681776000, end: 1681776900 },
  }),
}));
jest.mock('../../hooks/use_time_range_async');

const mockStackTracesState = (state: Partial<AsyncState<{ charts: TopNSubchart[] }>>) =>
  jest.mocked(useTimeRangeAsync).mockReturnValue({
    status: AsyncStatus.Settled,
    refresh: jest.fn(),
    ...state,
  });

// Runs the request the view passes to `useTimeRangeAsync`
const requestStackTraces = () => {
  const [[request]] = jest.mocked(useTimeRangeAsync).mock.calls;
  return request({ http: {} as Parameters<typeof request>[0]['http'] });
};

describe('StackTracesView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchema = ProfilingSchema.OTEL;
  });

  it('requests the stacktraces of the selected schema', () => {
    mockStackTracesState({ status: AsyncStatus.Loading });

    render(<StackTracesView />);
    requestStackTraces();

    expect(mockFetchTopN).toHaveBeenCalledWith(
      expect.objectContaining({ type: TopNType.Hosts, schema: ProfilingSchema.OTEL })
    );
  });

  it('waits for a schema before requesting the stacktraces', () => {
    mockSchema = undefined;
    mockStackTracesState({ status: AsyncStatus.Init });

    render(<StackTracesView />);

    expect(requestStackTraces()).toBeUndefined();
    expect(mockFetchTopN).not.toHaveBeenCalled();
  });

  it('prompts to change the search when there are no stacktraces', () => {
    mockStackTracesState({ data: { charts: [] } });

    render(<StackTracesView />);

    expect(screen.getByTestId('profilingNoDataPrompt')).toBeInTheDocument();
    expect(StackTraces).not.toHaveBeenCalled();
  });

  it('renders the stacktraces when there are some', () => {
    const data = { charts: [{ Category: 'host-1' } as TopNSubchart] };
    mockStackTracesState({ data });

    render(<StackTracesView />);

    expect(StackTraces).toHaveBeenCalledWith(
      expect.objectContaining({ state: expect.objectContaining({ data }) }),
      expect.anything()
    );
    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('does not prompt while the stacktraces are loading', () => {
    mockStackTracesState({ status: AsyncStatus.Loading });

    render(<StackTracesView />);

    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('does not prompt while reloading after a search without stacktraces', () => {
    mockStackTracesState({ status: AsyncStatus.Loading, data: { charts: [] } });

    render(<StackTracesView />);

    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
    expect(StackTraces).toHaveBeenCalled();
  });
});
