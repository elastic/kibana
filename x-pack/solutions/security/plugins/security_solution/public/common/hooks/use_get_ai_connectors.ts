/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppToasts } from './use_app_toasts';
import { loadAiConnectors } from '../utils/connectors/ai_connectors';

const QUERY_KEY = ['siem_migrations', 'ai_connectors'];

export const useGetAIConnectors = (http: HttpSetup) => {
  const { addError } = useAppToasts();
  const { data, ...rest } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => loadAiConnectors(http),
    onError: (error) => {
      addError(error, {
        title: 'Error loading AI connectors',
      });
    },
  });

  return useMemo(
    () => ({
      aiConnectors: data ?? [],
      ...rest,
    }),
    [data, rest]
  );
};

export const useInvalidateGetAIConnectors = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(QUERY_KEY);
  }, [queryClient]);
};
