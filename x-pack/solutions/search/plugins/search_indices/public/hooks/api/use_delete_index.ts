/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../../constants';
import { useKibana } from '../use_kibana';

export const useDeleteIndex = (indexName: string) => {
  const { http } = useKibana().services;
  const indices = [indexName];
  const body = JSON.stringify({
    indices,
  });
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async () => {
      const response = await http.post<AcknowledgedResponseBase>(
        `/api/index_management/indices/delete`,
        {
          body,
        }
      );
      return response.acknowledged;
    },
    onSettled: () => {
      queryClient.invalidateQueries([QueryKeys.FetchIndex, indexName]);
      queryClient.invalidateQueries([QueryKeys.SearchDocuments, indexName]);
    },
  });
  return { ...result };
};
