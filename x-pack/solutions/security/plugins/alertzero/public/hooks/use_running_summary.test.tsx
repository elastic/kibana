/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useWorkers } from './use_workers_api';
import { useRunningSummary } from './use_running_summary';

jest.mock('./use_workers_api');

const mockUseWorkers = useWorkers as jest.Mock;

const worker = (id: string, enabled: boolean, watchIds: string[]) => ({ id, enabled, watchIds });

describe('useRunningSummary', () => {
  it('should count a Watch once when any of its Workers is enabled', () => {
    mockUseWorkers.mockReturnValue({
      data: {
        workers: [
          worker('a', true, ['floor']),
          worker('b', true, ['floor']),
          worker('c', true, ['hunt']),
          worker('d', false, ['detection']),
        ],
      },
    });

    const { result } = renderHook(() => useRunningSummary());

    expect(result.current).toEqual({ watchCount: 2, enabledWorkerCount: 3, workerCount: 4 });
  });

  it('should report zeros before the Workers load', () => {
    mockUseWorkers.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useRunningSummary());

    expect(result.current).toEqual({ watchCount: 0, enabledWorkerCount: 0, workerCount: 0 });
  });
});
