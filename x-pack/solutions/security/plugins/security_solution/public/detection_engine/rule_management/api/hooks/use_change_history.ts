/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { Rule, FilterOptions } from '../../logic';
import { DETECTION_ENGINE_RULES_URL_HISTORY } from '../../../../../common/constants';
import { fetchRuleChangeHistoryById } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

// TODO: Move these somewhere else
export type ChangeHistoryResult = z.infer<typeof ChangeHistoryResult>;
export const ChangeHistoryResult = z.object({
  timestamp: z.string().datetime(),
  version: z.number().int().optional(),
  userId: z.string(),
  message: z.string(),
  changedFields: z.array(z.string()),
});
export type ChangeHistoryResponse = z.infer<typeof ChangeHistoryResponse>;
export const ChangeHistoryResponse = z.object({
  items: z.array(ChangeHistoryResult).optional(),
  total: z.number().int().optional(),
});

export interface GetChangeHistoryQueryArgs {
  id: string;
  filterOptions?: FilterOptions;
  page: number;
  perPage: number;
  rule: Rule | null;
}

const GET_RULES_CHANGE_HISTORY_QUERY_KEY = ['GET', DETECTION_ENGINE_RULES_URL_HISTORY];

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal.
 *
 * @param queryArgs - fetch rules filters/pagination
 * @param queryOptions - react-query options
 * @returns useQuery result
 */
export const useChangeHistory = (
  queryArgs: GetChangeHistoryQueryArgs,
  queryOptions?: UseQueryOptions<
    ChangeHistoryResponse,
    Error,
    ChangeHistoryResponse,
    [...string[], GetChangeHistoryQueryArgs]
  >
) => {
  return useQuery(
    [...GET_RULES_CHANGE_HISTORY_QUERY_KEY, queryArgs],
    async ({ signal }) => {
      const response = await fetchRuleChangeHistoryById({ signal, ...queryArgs });

      return { items: response.items, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      // Mark this query as immediately stale helps to avoid problems related to filtering.
      // e.g. enabled and disabled state filter require data update which happens at the backend side
      staleTime: 0,
      ...queryOptions,
    }
  );
};
