/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useExecutiveBrief } from './use_executive_brief';

const mockMutate = jest.fn();
const mockGenerateState: { data?: { id: string }; error: Error | null; isLoading: boolean } = {
  data: undefined,
  error: null,
  isLoading: false,
};

jest.mock('./use_generate_executive_brief', () => ({
  useGenerateExecutiveBrief: () => ({ mutate: mockMutate, ...mockGenerateState }),
}));

jest.mock('./use_executive_brief_job', () => ({
  useExecutiveBriefJob: () => ({ data: undefined, error: null, hasTimedOut: false }),
}));

describe('useExecutiveBrief', () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockGenerateState.data = undefined;
    mockGenerateState.error = null;
    mockGenerateState.isLoading = false;
    window.localStorage.clear();
  });

  it('does not generate on mount, even when the generator selection is ready', () => {
    const { result } = renderHook(() =>
      useExecutiveBrief('7d', { isReady: true, generator: 'inference', connectorId: 'sonnet' })
    );

    expect(mockMutate).not.toHaveBeenCalled();
    expect(result.current.hasRequested).toBe(false);
    expect(result.current.isGenerating).toBe(false);
  });

  it('generates only when regenerate is called', () => {
    const { result } = renderHook(() =>
      useExecutiveBrief('7d', { isReady: true, generator: 'inference', connectorId: 'sonnet' })
    );

    act(() => result.current.regenerate());

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ generator: 'inference', connectorId: 'sonnet', mode: 'names' })
    );
  });

  it('reports a request in flight once a job id exists', () => {
    mockGenerateState.data = { id: 'job-1' };
    const { result } = renderHook(() => useExecutiveBrief('7d'));

    expect(result.current.hasRequested).toBe(true);
    expect(result.current.isGenerating).toBe(true);
  });
});
