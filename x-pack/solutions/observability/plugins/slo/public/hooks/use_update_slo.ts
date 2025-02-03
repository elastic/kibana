/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { encode } from '@kbn/rison';
import type { FindSLOResponse, UpdateSLOInput, UpdateSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { paths } from '../../common/locators/paths';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateSlo() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const { sloClient } = usePluginContext();

  return useMutation<
    UpdateSLOResponse,
    ServerError,
    { sloId: string; slo: UpdateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey; sloId: string }
  >(
    ['updateSlo'],
    ({ sloId, slo }) => {
      return sloClient.fetch('PUT /api/observability/slos/{id} 2023-10-31', {
        params: { path: { id: sloId }, body: slo },
      });
    },
    {
      onSuccess: (_data, { slo: { name } }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });

        toasts.addSuccess(
          i18n.translate('xpack.slo.update.successNotification', {
            defaultMessage: 'Successfully updated {name}',
            values: { name },
          })
        );
      },
      onError: (error, { slo, sloId }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.update.errorNotification', {
            defaultMessage: 'Something went wrong when updating {name}',
            values: { name: slo.name },
          }),
        });

        navigateToUrl(http.basePath.prepend(paths.sloEditWithEncodedForm(sloId, encode(slo))));
      },
    }
  );
}
