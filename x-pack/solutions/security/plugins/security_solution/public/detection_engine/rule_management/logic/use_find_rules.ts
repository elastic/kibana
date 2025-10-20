/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { FindRulesQueryArgs } from '../api/hooks/use_find_rules_query';
import { useFindRulesQuery } from '../api/hooks/use_find_rules_query';
import * as i18n from './translations';
import type { FilterOptions, Rule } from './types';

const ALLOW_EXPENSIVE_QUERIES_STORAGE_KEY =
  'securitySolution.rulesManagement.allowExpensiveQueries';

export interface RulesQueryData {
  rules: Rule[];
  total: number;
}

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param requestArgs - fetch rules filters/pagination
 * @param options - react-query options
 * @returns useQuery result
 */
export const useFindRules = (
  requestArgs: FindRulesQueryArgs,
  options?: UseQueryOptions<
    RulesQueryData,
    Error,
    RulesQueryData,
    [...string[], FindRulesQueryArgs]
  >
) => {
  const { addError } = useAppToasts();
  const [allowExpensiveQueries, setAllowExpensiveQueries] = useSessionStorage<boolean>(
    ALLOW_EXPENSIVE_QUERIES_STORAGE_KEY,
    true
  );
  const filterOptions = requestArgs.filterOptions || ({} as FilterOptions);
  filterOptions.allowExpensiveQueries = Boolean(allowExpensiveQueries ?? true);

  return useFindRulesQuery(requestArgs, {
    onError: (error: Error) => {
      const httpError = error as IHttpFetchError<{ message: string }>;
      const errorMessage = httpError?.body?.message;
      if (
        httpError?.response?.status === 400 &&
        errorMessage?.includes('search.allow_expensive_queries')
      ) {
        return setAllowExpensiveQueries(false);
      }
      return addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
    },
    ...options,
  });
};
