/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types/pagination';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { INPUT_THROTTLE_DELAY_MS } from '../../../shared/constants/timers';
import { HttpLogic } from '../../../shared/http';

export interface FetchAvailabeIndicesApiParams {
  searchQuery?: string;
}
export interface FetchAvailableIndicesApiResponse {
  indexNames: string[];
  meta: Meta;
}

export const fetchAvailableIndices = async ({
  searchQuery,
}: FetchAvailabeIndicesApiParams): Promise<FetchAvailableIndicesApiResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/connectors/available_indices';
  const query = { search_query: searchQuery || null };
  const response = await http.get<FetchAvailableIndicesApiResponse>(route, { query });
  return response;
};

export const FetchAvailableIndicesAPILogic = createApiLogic(
  ['content', 'fetch_available_indices_api_logic'],
  fetchAvailableIndices,
  {
    requestBreakpointMS: INPUT_THROTTLE_DELAY_MS,
  }
);

export type FetchAvailableIndicesApiActions = Actions<
  FetchAvailabeIndicesApiParams,
  FetchAvailableIndicesApiResponse
>;
