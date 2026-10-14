/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  SignificantEventsWorkflowStatus,
  type Feature,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { ONBOARDING_START_GRACE_MS, RUNNING_POLL_INTERVAL_MS } from '../../common/constants';
import { useFetchKnowledgeIndicators } from './use_fetch_knowledge_indicators';

let mockSources: Array<{ id: string; enabled?: boolean; esql_updated_at?: string }> = [
  { id: 'source-1' },
];
let mockFeatures: Feature[] = [];
let mockStatus: SignificantEventsWorkflowStatusResult;
const mockFetchFeatures = jest.fn(async () => ({ features: mockFeatures }));
const mockFetchQueries = jest.fn(async () => ({ queries: [] }));
const mockGetOnboardingStatuses = jest.fn(
  async (sourceIds: string[]): Promise<Record<string, SignificantEventsWorkflowStatusResult>> =>
    Object.fromEntries(sourceIds.map((sourceId) => [sourceId, mockStatus]))
);
const mockShowFetchErrorToast = jest.fn();

jest.mock('./use_fetch_features', () => ({
  useFetchFeatures: () => {
    const { useQuery } = jest.requireActual<typeof import('@kbn/react-query')>('@kbn/react-query');
    return useQuery({ queryKey: ['features', 'all'], queryFn: mockFetchFeatures });
  },
}));
jest.mock('../rules/use_fetch_discovery_queries', () => ({
  useFetchDiscoveryQueries: () => {
    const { useQuery } = jest.requireActual<typeof import('@kbn/react-query')>('@kbn/react-query');
    return useQuery({ queryKey: ['discoveryQueries'], queryFn: mockFetchQueries });
  },
}));
jest.mock('../sources/use_fetch_sources', () => ({
  useFetchSources: () => ({ data: mockSources }),
}));
jest.mock('../sources/use_onboarding_api', () => ({
  useOnboardingApi: () => ({ getOnboardingStatuses: mockGetOnboardingStatuses }),
}));
jest.mock('../../hooks/use_fetch_error_toast', () => ({
  useFetchErrorToast: () => mockShowFetchErrorToast,
}));

const makeFeature = (id: string): Feature => ({
  id,
  uuid: id,
  source_id: 'source-1',
  type: 'entity',
  description: id,
  properties: {},
  confidence: 75,
});

describe('useFetchKnowledgeIndicators onboarding refresh', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSources = [{ id: 'source-1' }];
    mockFeatures = [];
    mockStatus = { status: SignificantEventsWorkflowStatus.InProgress, executionId: 'run-1' };
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    queryClient.clear();
    jest.useRealTimers();
  });

  const advancePoll = async () => {
    await act(async () => {
      jest.advanceTimersByTime(RUNNING_POLL_INTERVAL_MS);
    });
  };

  it('shows partial and completed results without the Sources generation provider', async () => {
    const { result } = renderHook(() => useFetchKnowledgeIndicators(), { wrapper });
    await waitFor(() => expect(mockFetchFeatures).toHaveBeenCalledTimes(2));
    expect(result.current.knowledgeIndicators).toEqual([]);
    const initialQueryReads = mockFetchQueries.mock.calls.length;

    mockFeatures = [makeFeature('partial')];
    await advancePoll();
    await waitFor(() => expect(result.current.knowledgeIndicators).toHaveLength(1));
    expect(result.current.knowledgeIndicators[0]).toEqual({
      kind: 'feature',
      feature: makeFeature('partial'),
    });
    expect(mockFetchQueries.mock.calls.length).toBeGreaterThan(initialQueryReads);

    mockFeatures = [makeFeature('partial'), makeFeature('completed')];
    mockStatus = { status: SignificantEventsWorkflowStatus.Completed, executionId: 'run-1' };
    await advancePoll();
    await waitFor(() => expect(result.current.knowledgeIndicators).toHaveLength(2));
    const completedStatusReads = mockGetOnboardingStatuses.mock.calls.length;
    const completedQueryReads = mockFetchQueries.mock.calls.length;

    await advancePoll();
    await advancePoll();
    expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(completedStatusReads);
    expect(mockFetchQueries).toHaveBeenCalledTimes(completedQueryReads);
  });

  it('refreshes a run that completed between the initial data and status requests', async () => {
    mockGetOnboardingStatuses.mockImplementationOnce(async () => {
      mockFeatures = [makeFeature('completed')];
      return {
        'source-1': {
          status: SignificantEventsWorkflowStatus.Completed,
          executionId: 'run-1',
        },
      };
    });
    const { result } = renderHook(() => useFetchKnowledgeIndicators(), { wrapper });

    await waitFor(() =>
      expect(result.current.knowledgeIndicators).toEqual([
        { kind: 'feature', feature: makeFeature('completed') },
      ])
    );
    await advancePoll();
    expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(1);
  });

  it.each<SignificantEventsWorkflowStatusResult>([
    { status: SignificantEventsWorkflowStatus.Canceled, executionId: 'run-1' },
    { status: SignificantEventsWorkflowStatus.Failed, executionId: 'run-1', error: 'Failed' },
    { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null },
  ])('does not keep polling a $status run', async (status) => {
    mockStatus = status;
    renderHook(() => useFetchKnowledgeIndicators(), { wrapper });

    await waitFor(() => expect(mockFetchFeatures).toHaveBeenCalledTimes(2));
    await advancePoll();
    await advancePoll();
    expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(1);
  });

  it('keeps polling a just-edited source until its run starts', async () => {
    mockSources = [{ id: 'source-1', enabled: true, esql_updated_at: new Date().toISOString() }];
    mockStatus = { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null };
    const { result } = renderHook(() => useFetchKnowledgeIndicators(), { wrapper });
    await waitFor(() => expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(1));

    await advancePoll();
    expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(2);

    mockFeatures = [makeFeature('generated')];
    mockStatus = { status: SignificantEventsWorkflowStatus.InProgress, executionId: 'run-2' };
    await advancePoll();
    await waitFor(() => expect(result.current.knowledgeIndicators).toHaveLength(1));
  });

  it('stops polling a just-edited source when no run starts within the grace period', async () => {
    mockSources = [{ id: 'source-1', enabled: true, esql_updated_at: new Date().toISOString() }];
    mockStatus = { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null };
    renderHook(() => useFetchKnowledgeIndicators(), { wrapper });
    await waitFor(() => expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(ONBOARDING_START_GRACE_MS + RUNNING_POLL_INTERVAL_MS);
    });
    const statusReadsAfterGrace = mockGetOnboardingStatuses.mock.calls.length;
    await advancePoll();
    await advancePoll();
    expect(mockGetOnboardingStatuses).toHaveBeenCalledTimes(statusReadsAfterGrace);
  });

  it('does not request onboarding status for an empty catalog', async () => {
    mockSources = [];
    const { result } = renderHook(() => useFetchKnowledgeIndicators(), { wrapper });

    await waitFor(() => expect(result.current.isEmpty).toBe(true));
    await advancePoll();
    expect(mockGetOnboardingStatuses).not.toHaveBeenCalled();
  });

  it('bounds status requests when the catalog is larger than one batch', async () => {
    mockSources = Array.from({ length: 1001 }, (_, index) => ({ id: `source-${index}` }));
    mockStatus = { status: SignificantEventsWorkflowStatus.Completed, executionId: 'run-1' };
    renderHook(() => useFetchKnowledgeIndicators(), { wrapper });

    await waitFor(() => expect(mockFetchFeatures).toHaveBeenCalledTimes(2));
    expect(mockGetOnboardingStatuses.mock.calls.map(([sourceIds]) => sourceIds.length)).toEqual([
      1000, 1,
    ]);
  });
});
