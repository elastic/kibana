/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  AI_HUNT_HISTORY_LIST_URL,
  AI_HUNT_HISTORY_URL,
} from '../../../../../common/entity_analytics/ai_hunt_history/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import type {
  CreateHuntRequest,
  CreateHuntResponse,
  GetHuntResponse,
  HuntListItem,
  ListHuntsResponse,
  PatchHuntRequest,
} from '../../../../../common/entity_analytics/ai_hunt_history/types';
import { useKibana } from '../../../../common/lib/kibana';
import { sortHuntListItems } from '../hunt_history';

const INTERNAL_OPTIONS = { version: API_VERSIONS.internal.v1 } as const;
const HUNT_HISTORY_QUERY_KEY = ['entityIntelligenceHuntHistory'] as const;

export interface UseHuntHistoryResult {
  hunts: HuntListItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  saveHunt: (request: CreateHuntRequest) => Promise<string>;
  getHunt: (id: string) => Promise<GetHuntResponse>;
  renameHunt: (id: string, name: string | null) => Promise<void>;
  setPinned: (id: string, pinned: boolean) => Promise<void>;
  deleteHunt: (id: string) => Promise<void>;
}

/**
 * React Query client over the internal AI Hunt history API. The list is sorted
 * pinned-first via the shared pure helper; mutations invalidate the list so the
 * history surface always reflects the latest saved state.
 */
export const useHuntHistory = (): UseHuntHistoryResult => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery(
    HUNT_HISTORY_QUERY_KEY,
    async ({ signal }) => {
      const response = await http.get<ListHuntsResponse>(AI_HUNT_HISTORY_LIST_URL, {
        ...INTERNAL_OPTIONS,
        signal,
      });
      return response;
    },
    { retry: 1, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  const invalidate = useCallback(
    () => queryClient.invalidateQueries(HUNT_HISTORY_QUERY_KEY),
    [queryClient]
  );

  const saveMutation = useMutation((request: CreateHuntRequest) =>
    http.post<CreateHuntResponse>(AI_HUNT_HISTORY_LIST_URL, {
      ...INTERNAL_OPTIONS,
      body: JSON.stringify(request),
    })
  );

  const patchMutation = useMutation(({ id, updates }: { id: string; updates: PatchHuntRequest }) =>
    http.patch<GetHuntResponse>(`${AI_HUNT_HISTORY_URL}/${id}`, {
      ...INTERNAL_OPTIONS,
      body: JSON.stringify(updates),
    })
  );

  const deleteMutation = useMutation((id: string) =>
    http.delete<{ success: boolean }>(`${AI_HUNT_HISTORY_URL}/${id}`, INTERNAL_OPTIONS)
  );

  const saveHunt = useCallback(
    async (request: CreateHuntRequest): Promise<string> => {
      const response = await saveMutation.mutateAsync(request);
      await invalidate();
      return response.id;
    },
    [saveMutation, invalidate]
  );

  const getHunt = useCallback(
    (id: string): Promise<GetHuntResponse> =>
      http.get<GetHuntResponse>(`${AI_HUNT_HISTORY_URL}/${id}`, INTERNAL_OPTIONS),
    [http]
  );

  const renameHunt = useCallback(
    async (id: string, name: string | null): Promise<void> => {
      await patchMutation.mutateAsync({ id, updates: { name } });
      await invalidate();
    },
    [patchMutation, invalidate]
  );

  const setPinned = useCallback(
    async (id: string, pinned: boolean): Promise<void> => {
      await patchMutation.mutateAsync({ id, updates: { pinned } });
      await invalidate();
    },
    [patchMutation, invalidate]
  );

  const deleteHunt = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
      await invalidate();
    },
    [deleteMutation, invalidate]
  );

  const hunts = useMemo(() => sortHuntListItems(data?.hunts ?? []), [data?.hunts]);

  return {
    hunts,
    total: data?.total ?? 0,
    isLoading,
    isError,
    refetch,
    saveHunt,
    getHunt,
    renameHunt,
    setPinned,
    deleteHunt,
  };
};
