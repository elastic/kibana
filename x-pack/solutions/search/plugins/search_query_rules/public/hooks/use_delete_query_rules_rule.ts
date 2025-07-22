/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { QUERY_RULES_SETS_QUERY_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

interface MutationArgs {
  rulesetId: string;
  ruleId: string;
}

export const useDeleteRulesetRule = (onSuccess?: () => void, onError?: (error: string) => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications },
  } = useKibana();

  return useMutation(
    async ({ rulesetId, ruleId }: MutationArgs) => {
      return await http.delete<{ acknowledged: boolean }>(
        `/internal/search_query_rules/ruleset/${rulesetId}/rule/${ruleId}`
      );
    },
    {
      onSuccess: (_, { rulesetId, ruleId }) => {
        queryClient.invalidateQueries([QUERY_RULES_SETS_QUERY_KEY]);
        notifications?.toasts?.addSuccess({
          title: i18n.translate('xpack.queryRules.deleteRulesetRuleSuccess', {
            defaultMessage: 'Rule {ruleId} deleted',
            values: { ruleId },
          }),
        });
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: { body: KibanaServerError; ruleId: string }) => {
        if (onError) {
          onError(error.body.message);
        } else {
          notifications?.toasts?.addError(new Error(error.body.message), {
            title: i18n.translate('xpack.queryRules.deleteRulesetRuleError', {
              defaultMessage: 'Error deleting rule {ruleId}',
              values: { ruleId: error.ruleId },
            }),
            toastMessage: error.body.message,
          });
        }
      },
    }
  );
};
