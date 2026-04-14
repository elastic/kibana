/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type {
  GetSpaceHealthRequestBody,
  GetSpaceHealthResponse,
} from '../../../../../common/api/detection_engine';
import { GET_SPACE_HEALTH_URL } from '../../../../../common/api/detection_engine';
import { api } from '../api_client';
import { DEFAULT_QUERY_OPTIONS } from './constants';

const GET_SPACE_RULES_HEALTH_KEY = ['POST', GET_SPACE_HEALTH_URL];

/**
 * Fetches health overview of all detection rules in the current Kibana space
 * via react-query. Provides default query key and options.
 */
export const useGetSpaceRulesHealthQuery = (
  queryArgs: GetSpaceHealthRequestBody,
  queryOptions?: UseQueryOptions<
    GetSpaceHealthResponse,
    Error,
    GetSpaceHealthResponse,
    [...string[], GetSpaceHealthRequestBody]
  >
) =>
  useQuery(
    [...GET_SPACE_RULES_HEALTH_KEY, queryArgs],
    async ({ signal }) => {
      const response = await api.fetchSpaceRulesHealth(queryArgs, signal);

      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...queryOptions,
    }
  );
