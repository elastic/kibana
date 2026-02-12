/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { MutationKeys, QueryKeys } from '../../constants';
import { useKibana } from '../use_kibana';
import type { IndexDocuments } from './use_document_search';

const INDEX_SEARCH_POLLING = 30000;

interface DeleteDocumentParams {
  id: string;
}

export const useDeleteDocument = (indexName: string) => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const result = useMutation(
    async ({ id }: DeleteDocumentParams) => {
      const response = await http.delete<AcknowledgedResponseBase>(
        `/internal/search_indices/${indexName}/documents/${id}`
      );
      return response.acknowledged;
    },
    {
      mutationKey: [MutationKeys.SearchIndicesDeleteDocument, indexName],
      onMutate: async ({ id }: DeleteDocumentParams) => {
        await queryClient.cancelQueries([QueryKeys.SearchDocuments, indexName]);

        const previousData = queryClient.getQueryData<IndexDocuments>([
          QueryKeys.SearchDocuments,
          indexName,
        ]);

        queryClient.setQueryData(
          [QueryKeys.SearchDocuments, indexName],
          (snapshot: IndexDocuments | undefined) => {
            const oldData = snapshot ?? { results: { data: [], _meta: { page: { total: 0 } } } };
            return {
              ...oldData,
              results: {
                ...oldData.results,
                data: oldData.results.data.filter((doc: SearchHit) => doc._id !== id),
                _meta: {
                  page: {
                    ...oldData.results._meta.page,
                    total: oldData.results._meta.page.total - 1,
                  },
                },
              },
            } as IndexDocuments;
          }
        );

        return { previousData };
      },

      onSuccess: () => {
        setTimeout(() => {
          queryClient.invalidateQueries([QueryKeys.SearchDocuments, indexName]);
        }, INDEX_SEARCH_POLLING);
      },

      onError: (error, _, context) => {
        if (context?.previousData) {
          queryClient.setQueryData([QueryKeys.SearchDocuments, indexName], context.previousData);
        }
        return error;
      },
    }
  );
  return { ...result };
};
