/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import {
  APIRoutes,
  PlaygroundForm,
  PlaygroundFormFields,
  PlaygroundPageMode,
  QueryTestResponse,
} from '../types';
import { useKibana } from './use_kibana';
import { elasticsearchQueryString } from '../utils/user_query';

export const useElasticsearchQuery = (pageMode: PlaygroundPageMode) => {
  const { http } = useKibana().services;
  const {
    getValues,
    formState: { errors: formErrors },
  } = useFormContext<PlaygroundForm>();
  const executeEsQuery = () => {
    const formValues = getValues();
    const esQuery = elasticsearchQueryString(
      formValues[PlaygroundFormFields.elasticsearchQuery],
      formValues[PlaygroundFormFields.userElasticsearchQuery],
      formErrors[PlaygroundFormFields.userElasticsearchQuery]
    );
    const body =
      pageMode === PlaygroundPageMode.chat
        ? JSON.stringify({
            elasticsearch_query: esQuery,
            indices: formValues[PlaygroundFormFields.indices],
            query: formValues[PlaygroundFormFields.question],
            chat_context: {
              source_fields: JSON.stringify(formValues[PlaygroundFormFields.sourceFields]),
              doc_size: formValues[PlaygroundFormFields.docSize],
            },
          })
        : JSON.stringify({
            elasticsearch_query: esQuery,
            indices: formValues[PlaygroundFormFields.indices],
            query: formValues[PlaygroundFormFields.searchQuery],
          });

    return http.post<QueryTestResponse>(APIRoutes.POST_QUERY_TEST, {
      body,
    });
  };

  const { refetch: executeQuery, ...rest } = useQuery({
    queryKey: ['searchPlayground', 'queryTest'],
    queryFn: executeEsQuery,
    enabled: false,
    retry: false,
  });

  return {
    executeQuery,
    ...rest,
  };
};
