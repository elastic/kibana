/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { ReadRuleExecutionResultsResponse } from '../../../../../common/api/detection_engine/rule_monitoring';
import { READ_RULE_EXECUTION_RESULTS_URL } from '../../../../../common/api/detection_engine/rule_monitoring';
import type { ReadRuleExecutionResultsRequestArgs } from '../../api';
import { api } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../../api/hooks/constants';
import * as i18n from './translations';

export const READ_EXECUTION_RESULTS_QUERY_KEY = ['POST', READ_RULE_EXECUTION_RESULTS_URL];

export const useReadExecutionResults = (args: ReadRuleExecutionResultsRequestArgs) => {
  const { addError } = useAppToasts();

  return useQuery<ReadRuleExecutionResultsResponse>(
    [...READ_EXECUTION_RESULTS_QUERY_KEY, args],
    ({ signal }) => api.readRuleExecutionResults({ ...args, signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      keepPreviousData: true,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ERROR });
      },
    }
  );
};

export const useInvalidateReadExecutionResultsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(READ_EXECUTION_RESULTS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
