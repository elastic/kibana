/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import type {
  PutServerlessSLOSettingsParams,
  PutSLOSettingsParams,
  PutSLOSettingsResponse,
} from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function usePutSloSettings() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<
    PutSLOSettingsResponse,
    ServerError,
    { settings: PutSLOSettingsParams | PutServerlessSLOSettingsParams }
  >(
    ['putSloSettings'],
    ({ settings }) => {
      return sloClient.fetch(`PUT /internal/slo/settings`, {
        params: { body: settings },
      });
    },
    {
      onSuccess: (data, { settings }) => {
        toasts.addSuccess({
          title: i18n.translate('xpack.slo.settings.successNotification', {
            defaultMessage: 'Success updated slo settings',
          }),
        });
        navigateToUrl(http.basePath.prepend(paths.slos));
      },
      onError: (error, { settings }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.settings.errorNotification', {
            defaultMessage: 'Something went wrong while updating settings',
          }),
        });
      },
    }
  );
}
