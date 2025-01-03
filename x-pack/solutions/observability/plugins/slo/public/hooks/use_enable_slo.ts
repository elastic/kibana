/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useEnableSlo() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<void, ServerError, { id: string; name: string }>(
    ['enableSlo'],
    ({ id }) => {
      try {
        return sloClient.fetch(`POST /api/observability/slos/{id}/enable 2023-10-31`, {
          params: { path: { id } },
        });
      } catch (error) {
        return Promise.reject(`Something went wrong: ${String(error)}`);
      }
    },
    {
      onError: (error, { name }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.enable.errorNotification', {
            defaultMessage: 'Failed to enable {name}',
            values: { name },
          }),
        });
      },
      onSuccess: (_data, { name }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.details(), exact: false });

        toasts.addSuccess(
          i18n.translate('xpack.slo.enable.successNotification', {
            defaultMessage: 'Enabled {name}',
            values: { name },
          })
        );
      },
    }
  );
}
