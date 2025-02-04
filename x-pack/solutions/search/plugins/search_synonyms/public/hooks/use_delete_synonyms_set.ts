/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { SYNONYMS_SETS_QUERY_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

interface MutationArgs {
  synonymsSetId: string;
}

export const useDeleteSynonymsSet = (onSuccess?: () => void, onError?: (error: string) => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications },
  } = useKibana();

  return useMutation(
    async ({ synonymsSetId }: MutationArgs) => {
      return await http.delete<{ acknowledged: boolean }>(
        `/internal/search_synonyms/synonyms/${synonymsSetId}`
      );
    },
    {
      onSuccess: (_, { synonymsSetId }) => {
        queryClient.invalidateQueries([SYNONYMS_SETS_QUERY_KEY]);
        notifications?.toasts?.addSuccess({
          title: i18n.translate('xpack.searchSynonyms.deleteSynonymsSetSuccess', {
            defaultMessage: 'Synonyms set {synonymsSetId} deleted',
            values: { synonymsSetId },
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
            title: i18n.translate('xpack.searchSynonyms.deleteSynonymsSetError', {
              defaultMessage: 'Error deleting synonyms set',
            }),
            toastMessage: error.body.message,
          });
        }
      },
    }
  );
};
