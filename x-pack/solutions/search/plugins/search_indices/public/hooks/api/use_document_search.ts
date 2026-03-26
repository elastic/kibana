/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pagination } from '@elastic/eui';
import type { SearchHit } from '@kbn/es-types';
import type { Paginate } from '@kbn/search-index-documents';
import { pageToPagination } from '@kbn/search-index-documents';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import { QueryKeys, DEFAULT_DOCUMENT_PAGE_SIZE } from '../../constants';

export interface IndexDocuments {
  meta: Pagination;
  results: Paginate<SearchHit>;
}
const DEFAULT_PAGINATION = {
  from: 0,
  has_more_hits_than_total: false,
  size: DEFAULT_DOCUMENT_PAGE_SIZE,
  total: 0,
};
export const useIndexDocumentSearch = (indexName: string) => {
  const {
    services: { http },
  } = useKibana();
  const { data, isInitialLoading, refetch } = useQuery({
    queryKey: [QueryKeys.SearchDocuments, indexName],
    refetchOnWindowFocus: 'always',
    queryFn: async ({ signal }) =>
      http.post<IndexDocuments>(`/internal/search_indices/${indexName}/documents/search`, {
        body: JSON.stringify({
          searchQuery: '',
          trackTotalHits: true,
        }),
        query: {
          page: 0,
          size: DEFAULT_DOCUMENT_PAGE_SIZE,
        },
        signal,
      }),
  });
  return {
    data,
    refetch,
    isInitialLoading,
    meta: pageToPagination(data?.results?._meta?.page ?? DEFAULT_PAGINATION),
  };
};
