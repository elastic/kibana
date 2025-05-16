/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@tanstack/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { useFetchRuleByIdQuery } from '../api/hooks/use_fetch_rule_by_id_query';
import * as i18n from './translations';

/**
 * Hook for using to get a Rule from the Detection Engine API
 *
 * @param id desired Rule ID's (not rule_id)
 * @param showToast whether to show toasts on error
 * @param options options for the useQuery
 */
export const useRule = (
  id: string,
  showToast = true,
  options: UseQueryOptions<RuleResponse> = {}
) => {
  const { addError } = useAppToasts();
  let fetchRuleOptions = {
    ...options,
  };

  if (showToast) {
    fetchRuleOptions = {
      ...fetchRuleOptions,
      onError: (error) => {
        addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
      },
    };
  }

  return useFetchRuleByIdQuery(id, fetchRuleOptions);
};
