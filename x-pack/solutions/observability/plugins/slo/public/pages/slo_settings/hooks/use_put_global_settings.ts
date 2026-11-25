/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { PutSLOGlobalSettingsParams, PutSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { GLOBAL_SETTINGS_QUERY_KEY } from './use_get_global_settings';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function usePutGlobalSettings() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<PutSLOGlobalSettingsResponse, ServerError, PutSLOGlobalSettingsParams>(
    ['putSloGlobalSettings'],
    (body) =>
      sloClient.fetch('PUT /api/observability/slo_settings/global 2023-10-31', {
        params: { body },
      }),
    {
      onSuccess: (data) => {
        queryClient.setQueryData(GLOBAL_SETTINGS_QUERY_KEY, data);
        toasts.addSuccess({
          title: i18n.translate('xpack.slo.globalSettings.successNotification', {
            defaultMessage: 'Global SLO settings saved',
          }),
        });
      },
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.globalSettings.errorNotification', {
            defaultMessage: 'Something went wrong while saving the global SLO settings',
          }),
        });
      },
    }
  );
}
