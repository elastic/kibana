/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { MutationKeys, QueryKeys } from '../../constants';
import { useKibana } from '../use_kibana';
import type { UpdateIndexMappingsRequest } from '../../../common/types';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

export const useUpdateMappings = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const { mutate: updateIndexMappings, ...rest } = useMutation<
    AcknowledgedResponseBase,
    ServerError,
    UpdateIndexMappingsRequest
  >({
    mutationKey: [MutationKeys.SearchIndicesUpdateMappings],
    mutationFn: async (input: UpdateIndexMappingsRequest) =>
      http.put<AcknowledgedResponseBase>(
        `/api/index_management/mapping/${encodeURIComponent(input.indexName)}`,
        {
          body: JSON.stringify(input.fields),
        }
      ),
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries([QueryKeys.FetchMapping, variables.indexName]);
    },
  });

  return { updateIndexMappings, ...rest };
};
