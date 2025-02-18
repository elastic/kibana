/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SynonymsPutSynonymRuleResponse } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from './use_kibana';

interface MutationArgs {
  synonymsSetId: string;
  ruleId: string;
  synonyms: string;
}

export const usePutSynonymsRule = (onSuccess?: () => void, onError?: (error: string) => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications },
  } = useKibana();

  return useMutation(
    async ({ synonymsSetId, ruleId, synonyms }: MutationArgs) => {
      return await http.put<SynonymsPutSynonymRuleResponse>(
        `/internal/search_synonyms/synonyms/${synonymsSetId}/${ruleId}`,
        {
          body: JSON.stringify({
            synonyms,
          }),
        }
      );
    },
    {
      onSuccess: (_, { ruleId }) => {
        queryClient.invalidateQueries(['synonyms-sets-fetch']);
        queryClient.invalidateQueries(['synonyms-rule-fetch']);
        notifications?.toasts?.addSuccess({
          title: i18n.translate('xpack.searchSynonyms.putSynonymsRuleSuccess', {
            defaultMessage: 'Synonyms rule {ruleId} updated',
            values: { ruleId },
          }),
        });
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: { body: KibanaServerError }) => {
        if (onError) {
          onError(error.body.message);
        } else {
          notifications?.toasts?.addError(new Error(error.body.message), {
            title: i18n.translate('xpack.searchSynonyms.putSynonymsRuleError', {
              defaultMessage: 'Error updating synonyms rule',
            }),
            toastMessage: error.body.message,
          });
        }
      },
    }
  );
};
