/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteInvestigation() {
  const queryClient = useQueryClient();
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<void, ServerError, { investigationId: string }, { investigationId: string }>(
    ['deleteInvestigation'],
    ({ investigationId }) => {
      return http.delete<void>(`/api/observability/investigations/${investigationId}`, {
        version: '2023-10-31',
      });
    },
    {
      onSuccess: (response, {}) => {
        toasts.addSuccess(
          i18n.translate('xpack.investigateApp.deleteInvestigationSuccess', {
            defaultMessage: 'Investigation deleted successfully',
          })
        );
        queryClient.invalidateQueries({ queryKey: investigationKeys.all });
      },
      onError: (error, {}, context) => {
        toasts.addError(
          new Error(
            error.body?.message ??
              i18n.translate('xpack.investigateApp.deleteInvestigationError', {
                defaultMessage: 'Unable to delete investigation: an error occurred',
              })
          ),
          {
            title: i18n.translate('xpack.investigateApp.deleteInvestigationErrorTitle', {
              defaultMessage: 'Error',
            }),
          }
        );
      },
    }
  );
}
