/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SynonymsPutSynonymResponse } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { SYNONYMS_RULE_FETCH_QUERY_KEY, SYNONYMS_SETS_QUERY_KEY } from '../../common/constants';
import { PLUGIN_ROUTE_ROOT } from '../../common/api_routes';
import { useKibana } from './use_kibana';

interface MutationArgs {
  synonymsSetId: string;
}

export const usePutSynonymsSet = (onSuccess?: () => void, onError?: (error: string) => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications, application },
  } = useKibana();

  return useMutation(
    async ({ synonymsSetId }: MutationArgs) => {
      return await http.put<SynonymsPutSynonymResponse>(
        `/internal/search_synonyms/synonyms/${synonymsSetId}`
      );
    },
    {
      onSuccess: (_, { synonymsSetId }) => {
        queryClient.invalidateQueries([SYNONYMS_RULE_FETCH_QUERY_KEY]);
        queryClient.invalidateQueries([SYNONYMS_SETS_QUERY_KEY]);
        notifications?.toasts?.addSuccess({
          title: i18n.translate('xpack.searchSynonyms.putSynonymsSetSuccess', {
            defaultMessage: 'Synonyms set added',
          }),
        });
        if (onSuccess) {
          onSuccess();
        }
        application.navigateToUrl(
          http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/sets/${synonymsSetId}`)
        );
      },
      onError: (error: { body: KibanaServerError }) => {
        if (onError) {
          onError(error.body.message);
        } else {
          notifications?.toasts?.addError(new Error(error.body.message), {
            title: i18n.translate('xpack.searchSynonyms.putSynonymsSetError', {
              defaultMessage: 'Error putting synonyms set',
            }),
            toastMessage: error.body.message,
          });
        }
      },
    }
  );
};
