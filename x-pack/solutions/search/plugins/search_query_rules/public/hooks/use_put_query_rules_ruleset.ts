/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import {
  QUERY_RULES_QUERY_RULESET_EXISTS_KEY,
  QUERY_RULES_QUERY_RULESET_FETCH_KEY,
  QUERY_RULES_SETS_QUERY_KEY,
} from '../../common/constants';
import { PLUGIN_ROUTE_ROOT } from '../../common/api_routes';
import { useKibana } from './use_kibana';

interface MutationArgs {
  rulesetId: string;
  forceWrite?: boolean;
  rules?: QueryRulesQueryRuleset['rules'];
}

export const usePutRuleset = (
  onSuccess?: () => void,
  onConflictError?: (error: KibanaServerError) => void
) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications, application },
  } = useKibana();

  return useMutation(
    async ({ rulesetId, forceWrite, rules }: MutationArgs) => {
      return await http.put<QueryRulesQueryRuleset>(
        `/internal/search_query_rules/ruleset/${rulesetId}`,
        {
          query: { forceWrite },
          ...(rules ? { body: JSON.stringify({ rules }) } : {}),
        }
      );
    },
    {
      onSuccess: (_, { rulesetId }) => {
        queryClient.invalidateQueries({ queryKey: [QUERY_RULES_QUERY_RULESET_FETCH_KEY] });
        queryClient.invalidateQueries({ queryKey: [QUERY_RULES_SETS_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [QUERY_RULES_QUERY_RULESET_EXISTS_KEY] });
        notifications?.toasts?.addSuccess({
          title: i18n.translate('xpack.queryRules.putRulesetSuccess', {
            defaultMessage: 'Ruleset added',
          }),
        });
        if (onSuccess) {
          onSuccess();
        }
        application.navigateToUrl(
          http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${rulesetId}`)
        );
      },
      onError: (error: { body: KibanaServerError }) => {
        if (onConflictError && error.body.statusCode === 409) {
          onConflictError(error.body);
        } else {
          notifications?.toasts?.addError(new Error(error.body.message), {
            title: i18n.translate('xpack.queryRules.putRulesetError', {
              defaultMessage: 'Error putting ruleset',
            }),
            toastMessage: error.body.message,
          });
        }
      },
    }
  );
};
