/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import type { HttpSetup } from '@kbn/core-http-browser';
import { APIRoutes, PlaygroundForm, PlaygroundFormFields, Pagination } from '../types';
import { useKibana } from './use_kibana';
import { DEFAULT_PAGINATION, SearchPlaygroundQueryKeys } from '../../common';
import { elasticsearchQueryObject } from '../utils/user_query';

export interface FetchSearchResultsArgs {
  query: string;
  pagination: Pagination;
  indices: PlaygroundForm[PlaygroundFormFields.indices];
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery];
  http: HttpSetup;
}

interface UseSearchPreviewData {
  executionTime: number;
  results: SearchHit[];
  pagination: Pagination;
}

export interface UseSearchPreviewResponse {
  fetchSearchResults: (args: FetchSearchResultsArgs) => Promise<void>;
  data: UseSearchPreviewData;
}

export const DEFAULT_SEARCH_PREVIEW_DATA: UseSearchPreviewData = {
  executionTime: 0,
  results: [],
  pagination: DEFAULT_PAGINATION,
};

export const fetchSearchResults = async ({
  query,
  indices,
  elasticsearchQuery,
  pagination: paginationParam = DEFAULT_PAGINATION,
  http,
}: FetchSearchResultsArgs): Promise<UseSearchPreviewData> => {
  return http.post<{
    executionTime: number;
    results: SearchHit[];
    pagination: Pagination;
  }>(APIRoutes.POST_SEARCH_QUERY, {
    body: JSON.stringify({
      search_query: query,
      elasticsearch_query: JSON.stringify(elasticsearchQuery),
      indices,
      size: paginationParam.size,
      from: paginationParam.from,
    }),
  });
};

export const useSearchPreview = ({
  query,
  pagination,
}: {
  query: string;
  pagination: Pagination;
}) => {
  const {
    services: { http },
  } = useKibana();
  const {
    getValues,
    formState: { errors: formErrors },
  } = useFormContext<PlaygroundForm>();
  const indices = getValues(PlaygroundFormFields.indices);
  const elasticsearchQuery = getValues(PlaygroundFormFields.elasticsearchQuery);
  const queryFn = () => {
    const formData = getValues();
    const elasticsearchQueryBody = elasticsearchQueryObject(
      formData[PlaygroundFormFields.elasticsearchQuery],
      formData[PlaygroundFormFields.userElasticsearchQuery],
      formErrors[PlaygroundFormFields.userElasticsearchQuery]
    );
    return fetchSearchResults({
      query,
      pagination,
      http,
      indices: formData[PlaygroundFormFields.indices],
      elasticsearchQuery: elasticsearchQueryBody,
    });
  };

  const { data } = useQuery({
    queryKey: [
      SearchPlaygroundQueryKeys.SearchPreviewResults,
      query,
      indices,
      elasticsearchQuery,
      pagination,
    ],
    queryFn,
    initialData: DEFAULT_SEARCH_PREVIEW_DATA,
    enabled: !!query,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  return {
    executionTime: data.executionTime,
    pagination: data.pagination,
    results: data.results,
  };
};
