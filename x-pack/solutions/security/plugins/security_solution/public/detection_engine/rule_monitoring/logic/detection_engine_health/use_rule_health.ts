/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  GetRuleHealthRequestBody,
  GetRuleHealthResponse,
} from '../../../../../common/api/detection_engine';
import { useGetRuleHealthQuery } from '../../api/hooks/use_get_rule_health';
import * as i18n from './translations';

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 */
export const useRuleHealth = (
  queryArgs: GetRuleHealthRequestBody,
  queryOptions?: UseQueryOptions<
    GetRuleHealthResponse,
    Error,
    GetRuleHealthResponse,
    [...string[], GetRuleHealthRequestBody]
  >
) => {
  const { addError } = useAppToasts();

  return useGetRuleHealthQuery(queryArgs, {
    onError: (error: Error) => addError(error, { title: i18n.RULE_HEALTH_FETCH_FAILURE }),
    ...queryOptions,
  });
};
