/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { useOnboardingStatusUpdateQueue } from './use_onboarding_status_update_queue';

const mockGetOnboardingStatuses = jest.fn();

jest.mock('../../../hooks/use_onboarding_api', () => ({
  useOnboardingApi: () => ({ getOnboardingStatuses: mockGetOnboardingStatuses }),
}));

const NOT_STARTED: SignificantEventsWorkflowStatusResult = {
  status: SignificantEventsWorkflowStatus.NotStarted,
  executionId: null,
};
const IN_PROGRESS: SignificantEventsWorkflowStatusResult = {
  status: SignificantEventsWorkflowStatus.InProgress,
  executionId: 'run-1',
};
const COMPLETED: SignificantEventsWorkflowStatusResult = {
  status: SignificantEventsWorkflowStatus.Completed,
  executionId: 'run-1',
};

describe('useOnboardingStatusUpdateQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetOnboardingStatuses.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports an active run on the first read of a source it waits for', async () => {
    mockGetOnboardingStatuses
      .mockResolvedValueOnce({ 'source-1': IN_PROGRESS })
      .mockResolvedValueOnce({ 'source-1': COMPLETED });
    const onSourceStatusUpdate = jest.fn();
    const { result } = renderHook(() => useOnboardingStatusUpdateQueue(onSourceStatusUpdate));

    result.current.expectOnboardingStart('source-1');
    result.current.onboardingStatusUpdateQueue.add('source-1');
    const processing = result.current.processStatusUpdateQueue();
    await jest.advanceTimersByTimeAsync(2_000);
    await processing;

    expect(onSourceStatusUpdate.mock.calls).toEqual([
      ['source-1', IN_PROGRESS],
      ['source-1', COMPLETED],
    ]);
  });

  it('reports nothing while no run exists, then reports the run once it appears', async () => {
    mockGetOnboardingStatuses
      .mockResolvedValueOnce({ 'source-1': NOT_STARTED })
      .mockResolvedValueOnce({ 'source-1': NOT_STARTED })
      .mockResolvedValueOnce({ 'source-1': IN_PROGRESS })
      .mockResolvedValueOnce({ 'source-1': COMPLETED });
    const onSourceStatusUpdate = jest.fn();
    const { result } = renderHook(() => useOnboardingStatusUpdateQueue(onSourceStatusUpdate));

    result.current.expectOnboardingStart('source-1');
    result.current.onboardingStatusUpdateQueue.add('source-1');
    const processing = result.current.processStatusUpdateQueue();
    await jest.advanceTimersByTimeAsync(2_000);
    expect(onSourceStatusUpdate).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(4_000);
    await processing;

    expect(onSourceStatusUpdate.mock.calls).toEqual([
      ['source-1', IN_PROGRESS],
      ['source-1', COMPLETED],
    ]);
  });
});
