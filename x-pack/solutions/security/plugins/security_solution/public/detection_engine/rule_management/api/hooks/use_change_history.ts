/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { RuleChangesHistoryResponse } from '../../../../../common/api/detection_engine/rule_management';
import { RULE_HISTORY_URL } from '../../../../../common/api/detection_engine/rule_management';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchRuleChangeHistoryById } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import * as i18n from './translations';

const RULE_CHANGE_HISTORY_QUERY_KEY = ['GET', RULE_HISTORY_URL];

export interface UseChangeHistoryArgs {
  ruleId: string;
  page: number;
  perPage: number;
}

/**
 * A wrapper around useQuery that fetches the change history for a rule.
 *
 * @param queryArgs - rule id and pagination
 * @param queryOptions - react-query options
 * @returns useQuery result
 */
export const useChangeHistory = (
  queryArgs: UseChangeHistoryArgs,
  queryOptions?: UseQueryOptions<
    RuleChangesHistoryResponse,
    Error,
    RuleChangesHistoryResponse,
    [...string[], UseChangeHistoryArgs]
  >
) => {
  const { addError } = useAppToasts();

  return useQuery(
    [...RULE_CHANGE_HISTORY_QUERY_KEY, queryArgs],
    ({ signal }) => fetchRuleChangeHistoryById({ signal, ...queryArgs }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      staleTime: 0,
      ...queryOptions,
      onError: (error) => {
        addError(error, { title: i18n.HISTORY_FETCH_ERROR });
      },
    }
  );
};
