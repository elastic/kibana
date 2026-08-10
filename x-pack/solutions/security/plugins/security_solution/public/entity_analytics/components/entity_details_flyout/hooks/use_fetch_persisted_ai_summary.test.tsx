/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { GetPersistedAiSummaryResponse } from '@kbn/entity-store/common';
import { useFetchPersistedAiSummary } from './use_fetch_persisted_ai_summary';
import { useEntityAnalyticsRoutes } from '../../../api/api';

jest.mock('../../../api/api');

describe('useFetchPersistedAiSummary', () => {
  const fetchPersistedAiSummary = jest.fn();
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({ fetchPersistedAiSummary });
  });

  const persisted: GetPersistedAiSummaryResponse = {
    canRead: true,
    summary: {
      highlights: [{ title: 'Risk', text: 'Elevated risk' }],
      recommended_actions: ['Investigate'],
      generated_at: 1748771200000,
      generated_by: 'alice',
      staleness: { enabled_signals: ['risk_score'], snapshot: { risk_score: 72 } },
    },
  };

  it('returns the persisted summary and canRead: true', async () => {
    fetchPersistedAiSummary.mockResolvedValueOnce(persisted);

    const { result } = renderHook(
      () => useFetchPersistedAiSummary({ entityType: 'user', entityIdentifier: 'user:alice' }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.summary).toEqual(persisted.summary);
      expect(result.current.canRead).toBe(true);
    });
    expect(fetchPersistedAiSummary).toHaveBeenCalledWith(
      { entityType: 'user', entityIdentifier: 'user:alice' },
      expect.any(AbortSignal)
    );
  });

  it('exposes canRead: false with a null summary when the user lacks metadata read access', async () => {
    fetchPersistedAiSummary.mockResolvedValueOnce({ summary: null, canRead: false });

    const { result } = renderHook(
      () => useFetchPersistedAiSummary({ entityType: 'user', entityIdentifier: 'user:bob' }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.summary).toBeNull();
    expect(result.current.canRead).toBe(false);
  });

  it('does not fetch when skip is true', async () => {
    renderHook(
      () =>
        useFetchPersistedAiSummary({
          entityType: 'user',
          entityIdentifier: 'user:alice',
          skip: true,
        }),
      { wrapper: TestWrapper }
    );

    expect(fetchPersistedAiSummary).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no entity identifier', async () => {
    renderHook(() => useFetchPersistedAiSummary({ entityType: 'user', entityIdentifier: '' }), {
      wrapper: TestWrapper,
    });

    expect(fetchPersistedAiSummary).not.toHaveBeenCalled();
  });
});
