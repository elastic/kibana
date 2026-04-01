/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';

import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { ActionTriggeredGenerationsResponse } from '../types';
import * as i18n from './translations';

const ROUTE_PATH = '/internal/attack_discovery/_action_triggered_generations';
const QUERY_KEY = ['GET', ROUTE_PATH];

const DEFAULT_FROM = 0;
const DEFAULT_SIZE = 20;

interface UseActionTriggeredGenerationsProps {
  end?: string;
  from?: number;
  http: HttpSetup;
  search?: string;
  size?: number;
  start?: string;
  status?: string[];
}

interface UseActionTriggeredGenerationsResult {
  data: ActionTriggeredGenerationsResponse | undefined;
  isError: boolean;
  isLoading: boolean;
  refetch: () => void;
}

export const useActionTriggeredGenerations = ({
  end,
  from = DEFAULT_FROM,
  http,
  search,
  size = DEFAULT_SIZE,
  start,
  status,
}: UseActionTriggeredGenerationsProps): UseActionTriggeredGenerationsResult => {
  const { addError } = useAppToasts();
  const abortController = useRef(new AbortController());

  const queryFn = useCallback(async () => {
    abortController.current.abort();
    abortController.current = new AbortController();

    return http.fetch<ActionTriggeredGenerationsResponse>(ROUTE_PATH, {
      method: 'GET',
      query: {
        ...(end != null ? { end } : {}),
        from,
        ...(search != null ? { search } : {}),
        size,
        ...(start != null ? { start } : {}),
        ...(status != null ? { status } : {}),
      },
      signal: abortController.current.signal,
      version: '1',
    });
  }, [end, from, http, search, size, start, status]);

  const { data, isError, isLoading, refetch } = useQuery(
    [...QUERY_KEY, end, from, search, size, start, status],
    queryFn,
    {
      keepPreviousData: true,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ACTION_TRIGGERED_GENERATIONS_FAILURE });
      },
      refetchOnWindowFocus: false,
    }
  );

  return { data, isError, isLoading, refetch };
};
