/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { RuleChangesHistoryResponse } from '../../../../../common/api/detection_engine/rule_management';
import { RULE_HISTORY_URL } from '../../../../../common/api/detection_engine/rule_management';
import { fetchRuleChangeHistoryById } from '../api';

const RULE_HAS_CHANGE_HISTORY_QUERY_KEY = ['GET', RULE_HISTORY_URL, 'has_history'];

export interface UseHasRuleChangeHistoryArgs {
  ruleId: string;
  enabled?: boolean;
}

export function useHasRuleChangeHistory({ ruleId, enabled = true }: UseHasRuleChangeHistoryArgs) {
  const { data, isLoading } = useQuery<RuleChangesHistoryResponse, Error>(
    [...RULE_HAS_CHANGE_HISTORY_QUERY_KEY, { ruleId }],
    ({ signal }) => fetchRuleChangeHistoryById({ signal, ruleId, page: 1, perPage: 1 }),
    { enabled, staleTime: Infinity }
  );

  return {
    hasHistory: (data?.total ?? 0) > 0,
    isLoading,
  };
}
