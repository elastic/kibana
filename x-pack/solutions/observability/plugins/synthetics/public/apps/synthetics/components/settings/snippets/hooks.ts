/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import type {
  SyntheticsServiceSnippetType,
  SyntheticsServiceSnippetWithIdType,
} from '../../../../../../common/runtime_types/synthetics_service_snippet';
import { deleteSnippet, getSnippets, postSnippet } from './api';

export const useGetSnippets = () => {
  const {
    data: snippets,
    error,
    isLoading,
    isFetching,
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
    isFetching,
  };
};

export const usePostSnippet = () => {
  return useMutation({
    mutationKey: ['postSnippet'],
    mutationFn: async ({ snippet }: { snippet: SyntheticsServiceSnippetType }) => {
      return await postSnippet({ snippet });
    },
  });
};

export const useDeleteSnippet = () => {
  return useMutation({
    mutationKey: ['deleteSnippet'],
    mutationFn: async ({ snippet }: { snippet: SyntheticsServiceSnippetWithIdType }) => {
      return await deleteSnippet({ snippet });
    },
  });
};
