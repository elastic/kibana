/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { APIRoutes, ChatFormFields, QueryTestResponse } from '../types';
import { useKibana } from './use_kibana';

export const useElasticsearchQuery = () => {
  const { http } = useKibana().services;
  const { getValues } = useFormContext();
  const executeEsQuery = () => {
    const indices = getValues(ChatFormFields.indices);
    const elasticsearchQuery = getValues(ChatFormFields.elasticsearchQuery);
    const query = getValues(ChatFormFields.searchQuery);
    return http.post<QueryTestResponse>(APIRoutes.POST_QUERY_TEST, {
      body: JSON.stringify({
        elasticsearch_query: JSON.stringify(elasticsearchQuery),
        indices,
        query,
      }),
    });
  };

  const { refetch: executeQuery, ...rest } = useQuery({
    queryFn: executeEsQuery,
    enabled: false,
  });

  return {
    executeQuery,
    ...rest,
  };
};
