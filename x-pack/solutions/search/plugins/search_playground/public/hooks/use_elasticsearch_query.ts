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
  ChatForm,
  ChatFormFields,
  PlaygroundPageMode,
  QueryTestResponse,
} from '../types';
import { useKibana } from './use_kibana';
import { elasticsearchQueryString } from '../utils/user_query';

export const useElasticsearchQuery = (pageMode: PlaygroundPageMode) => {
  const { http } = useKibana().services;
  const { getValues } = useFormContext<ChatForm>();
  const executeEsQuery = () => {
    const formValues = getValues();
    const esQuery = elasticsearchQueryString(
      formValues[ChatFormFields.elasticsearchQuery],
      formValues[ChatFormFields.userElasticsearchQuery],
      formValues[ChatFormFields.userElasticsearchQueryValidations]
    );
    const body =
      pageMode === PlaygroundPageMode.chat
        ? JSON.stringify({
            elasticsearch_query: esQuery,
            indices: formValues[ChatFormFields.indices],
            query: formValues[ChatFormFields.question],
            chat_context: {
              source_fields: JSON.stringify(formValues[ChatFormFields.sourceFields]),
              doc_size: formValues[ChatFormFields.docSize],
            },
          })
        : JSON.stringify({
            elasticsearch_query: esQuery,
            indices: formValues[ChatFormFields.indices],
            query: formValues[ChatFormFields.searchQuery],
          });

    return http.post<QueryTestResponse>(APIRoutes.POST_QUERY_TEST, {
      body,
    });
  };

  const { refetch: executeQuery, ...rest } = useQuery({
    queryFn: executeEsQuery,
    enabled: false,
    retry: false,
  });

  return {
    executeQuery,
    ...rest,
  };
};
