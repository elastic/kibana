/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import type { SyntheticsServiceSnippet } from '../../../../../../common/runtime_types/synthetics_service_snippet';
import { getSnippets, postSnippet } from './api';

export const useGetSnippets = () => {
  const {
    data: snippets,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['snippets'],
    queryFn: async () => {
      const response = await getSnippets();
      return response.snippets;
    },
    refetchInterval: 10 * 1000,
  });

  return {
    snippets,
    refetch,
    error,
    isLoading,
  };
};

export const usePostSnippet = () => {
  return useMutation({
    mutationKey: ['postSnippet'],
    mutationFn: async ({ snippet }: { snippet: SyntheticsServiceSnippet }) => {
      return await postSnippet({ snippet });
    },
  });
};
