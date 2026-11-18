/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import {
  API_VERSIONS as ENTITY_STORE_API_VERSIONS,
  ENTITY_STORE_ROUTES,
} from '@kbn/entity-store/common';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';
import { RESOLUTION_ERROR_TITLE, RULES_HEALTH_TOGGLED } from '../translations';
import { RESOLUTION_RULES_HEALTH_QUERY_KEY } from './use_resolution_rules_health';

interface SetRuleEnabledParams {
  ruleId: string;
  enabled: boolean;
}

/** PROTOTYPE: switches one resolution rule on or off through the public enable/disable routes. */
export const useSetResolutionRuleEnabled = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();

  return useMutation<unknown, IHttpFetchError, SetRuleEnabledParams>({
    mutationFn: ({ ruleId, enabled }) => {
      const route = enabled
        ? ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_ENABLE
        : ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_DISABLE;
      return http.fetch(route.replace('{id}', encodeURIComponent(ruleId)), {
        version: ENTITY_STORE_API_VERSIONS.public.v1,
        method: 'PUT',
        context: buildExecutionContext(
          EA_EXECUTION_CONTEXT_NAMES.ENTITY_RESOLUTION,
          'resolution_rule_toggle'
        ),
      });
    },
    onSuccess: (_result, { ruleId, enabled }) => {
      queryClient.invalidateQueries({ queryKey: [RESOLUTION_RULES_HEALTH_QUERY_KEY] });
      addSuccess({ title: RULES_HEALTH_TOGGLED(ruleId, enabled) });
    },
    onError: (error) => {
      addError(error, { title: RESOLUTION_ERROR_TITLE });
    },
  });
};
