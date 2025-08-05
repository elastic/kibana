/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { useKibana } from './use_kibana';
import { SearchQueryDocumentResponse } from '../types';

export const useFetchDocument = (indexName: string, documentId: string) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery<SearchQueryDocumentResponse, { body: KibanaServerError }>({
    queryKey: ['fetchDocument', indexName, documentId],
    queryFn: async () => {
      const response = await http.get<SearchQueryDocumentResponse>(
        `/internal/search_query_rules/document/${indexName}/${documentId}`
      );
      return response;
    },
    enabled: Boolean(indexName && documentId),
    refetchOnWindowFocus: false,
    retry: false,
  });
};
