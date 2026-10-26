/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ProfilingSchema, TopNType } from '@kbn/profiling-utils';
import { StackTraces } from './stack_traces';

const mockFetchTopN = jest
  .fn()
  .mockResolvedValue({ TotalCount: 0, TopN: [], Metadata: {}, Labels: {} });
// Stable across renders, like the actual dependencies, so requests only rerun when their inputs change
const mockDependencies = {
  start: { core: { http: {}, notifications: { toasts: { addError: jest.fn() } } } },
  services: { fetchTopN: mockFetchTopN },
};

jest.mock('../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => mockDependencies,
}));
jest.mock('../../components/stack_traces', () => ({ StackTraces: () => null }));

describe('StackTraces embeddable', () => {
  const props = {
    type: TopNType.Threads,
    kuery: 'host.name : "host-1"',
    rangeFrom: 1681776000000,
    rangeTo: 1681776900000,
    onClick: jest.fn(),
    onChartBrushEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the stacktraces of the given schema', async () => {
    render(<StackTraces {...props} schema={ProfilingSchema.OTEL} />);

    await waitFor(() =>
      expect(mockFetchTopN).toHaveBeenCalledWith(
        expect.objectContaining({ type: TopNType.Threads, schema: ProfilingSchema.OTEL })
      )
    );
  });

  it('requests the stacktraces again when the schema changes', async () => {
    const { rerender } = render(<StackTraces {...props} schema={ProfilingSchema.OTEL} />);
    await waitFor(() => expect(mockFetchTopN).toHaveBeenCalledTimes(1));

    rerender(<StackTraces {...props} schema={ProfilingSchema.ECS} />);

    await waitFor(() => expect(mockFetchTopN).toHaveBeenCalledTimes(2));
    expect(mockFetchTopN).toHaveBeenLastCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.ECS })
    );
  });

  it('leaves the schema to the API default when none is given', async () => {
    render(<StackTraces {...props} />);

    await waitFor(() =>
      expect(mockFetchTopN).toHaveBeenCalledWith(expect.objectContaining({ schema: undefined }))
    );
  });
});
