/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';

import { useHuntingLeads } from './use_hunting_leads';
import type { ApiLead } from './types';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('@kbn/react-query');
jest.mock('../../../api/api');
jest.mock('../../../../common/hooks/use_app_toasts');

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseQueryClient = useQueryClient as jest.Mock;
const mockUseEntityAnalyticsRoutes = useEntityAnalyticsRoutes as jest.Mock;
const mockUseAppToasts = useAppToasts as jest.Mock;

const mockFetchLeads = jest.fn();
const mockGenerateLeads = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockInvalidateQueries = jest.fn();

describe('useHuntingLeads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityAnalyticsRoutes.mockReturnValue({
      fetchLeads: mockFetchLeads,
      generateLeads: mockGenerateLeads,
      fetchLeadGenerationStatus: jest.fn().mockResolvedValue({ isEnabled: false }),
      enableLeadGeneration: jest.fn().mockResolvedValue({ success: true }),
      disableLeadGeneration: jest.fn().mockResolvedValue({ success: true }),
      fetchLeadGenerationPrivileges: jest
        .fn()
        .mockResolvedValue({ has_read_permissions: true, has_write_permissions: true }),
    });
    mockUseAppToasts.mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });
  });

  it('calls fetchLeads with correct params when queryFn executes', async () => {
    let capturedQueryFn: ((context: { signal?: AbortSignal }) => Promise<unknown>) | undefined;
    let queryCallCount = 0;
    mockUseQuery.mockImplementation(
      (config: { queryFn?: (ctx: { signal?: AbortSignal }) => Promise<unknown> }) => {
        queryCallCount++;
        // useQuery call order: 1=privileges, 2=fetchLeads, 3=fetchLeadGenerationStatus
        if (queryCallCount === 2) {
          capturedQueryFn = config.queryFn;
        }
        return {
          data: undefined,
          isLoading: false,
          refetch: jest.fn(),
        };
      }
    );

    renderHook(() => useHuntingLeads('test-connector-id'));

    expect(capturedQueryFn).toBeDefined();
    const mockSignal = new AbortController().signal;
    await act(async () => {
      await capturedQueryFn?.({ signal: mockSignal });
    });

    expect(mockFetchLeads).toHaveBeenCalledWith({
      signal: mockSignal,
      params: {
        page: 1,
        perPage: 10,
        sortField: 'priority',
        sortOrder: 'desc',
        status: 'active',
      },
    });
  });

  it('returns empty leads array when data is undefined', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    expect(result.current.leads).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('returns mapped leads when data has leads', () => {
    const apiLeads: ApiLead[] = [
      {
        id: 'lead-1',
        title: 'Test Lead',
        byline: 'Test byline',
        description: 'Test description',
        entities: [{ type: 'user', name: 'test-user' }],
        tags: ['tag1'],
        priority: 8,
        chatRecommendations: ['rec1'],
        timestamp: '2024-01-01T00:00:00.000Z',
        staleness: 'fresh',
        status: 'active',
        observations: [],
        executionUuid: 'exec-uuid-1',
        sourceType: 'adhoc',
      },
    ];

    mockUseQuery.mockReturnValue({
      data: { leads: apiLeads, total: 1 },
      isLoading: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    expect(result.current.leads).toHaveLength(1);
    expect(result.current.leads[0]).toEqual({
      id: 'lead-1',
      title: 'Test Lead',
      byline: 'Test byline',
      description: 'Test description',
      entities: [{ type: 'user', name: 'test-user' }],
      tags: ['tag1'],
      priority: 8,
      chatRecommendations: ['rec1'],
      timestamp: '2024-01-01T00:00:00.000Z',
      staleness: 'fresh',
      status: 'active',
      observations: [],
      sourceType: 'adhoc',
    });
    expect(result.current.totalCount).toBe(1);
  });

  it('generate function triggers mutation when called', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    act(() => {
      result.current.generate();
    });

    expect(mockMutate).toHaveBeenCalledWith();
  });

  it('returns isLoading from useQuery', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    expect(result.current.isLoading).toBe(true);
  });

  it('returns isGenerating from useMutation isLoading', () => {
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isLoading: true,
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    expect(result.current.isGenerating).toBe(true);
  });

  it('returns readPermissionError true when privileges indicate no read access', () => {
    mockUseQuery.mockImplementation((config: { queryKey?: string[]; queryFn?: () => unknown }) => {
      if (config.queryKey?.[0] === 'lead-generation-privileges') {
        return {
          data: { has_read_permissions: false, has_write_permissions: false },
          isLoading: false,
          refetch: jest.fn(),
        };
      }
      return { data: undefined, isLoading: false, refetch: jest.fn() };
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    expect(result.current.readPermissionError).toBe(true);
  });

  it('returns writePermissionError true when privileges indicate no write access', () => {
    mockUseQuery.mockImplementation((config: { queryKey?: string[]; queryFn?: () => unknown }) => {
      if (config.queryKey?.[0] === 'lead-generation-privileges') {
        return {
          data: { has_read_permissions: true, has_write_permissions: false },
          isLoading: false,
          refetch: jest.fn(),
        };
      }
      return { data: undefined, isLoading: false, refetch: jest.fn() };
    });

    const { result } = renderHook(() => useHuntingLeads('test-connector-id'));

    expect(result.current.writePermissionError).toBe(true);
    expect(result.current.readPermissionError).toBe(false);
  });
});
