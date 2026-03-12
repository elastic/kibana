/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type {
  GetRuleHealthRequestBody,
  GetRuleHealthResponse,
} from '../../../../../common/api/detection_engine';
import { GET_RULE_HEALTH_URL } from '../../../../../common/api/detection_engine';
import { api } from '../api_client';
import { DEFAULT_QUERY_OPTIONS } from './constants';

const GET_RULE_HEALTH_KEY = ['POST', GET_RULE_HEALTH_URL];

/**
 * Fetches health overview of the specified detection rule in the current Kibana space.
 * Provides default query key and options.
 */
export const useGetRuleHealthQuery = (
  queryArgs: GetRuleHealthRequestBody,
  queryOptions?: UseQueryOptions<
    GetRuleHealthResponse,
    Error,
    GetRuleHealthResponse,
    [...string[], GetRuleHealthRequestBody]
  >
) =>
  useQuery(
    [...GET_RULE_HEALTH_KEY, queryArgs],
    async ({ signal }) => {
      const response = await api.fetchRuleHealth(queryArgs, signal);

      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...queryOptions,
    }
  );
