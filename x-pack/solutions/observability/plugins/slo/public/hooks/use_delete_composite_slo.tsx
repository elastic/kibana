/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteCompositeSlo() {
  const {
    i18n: i18nStart,
    theme,
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<void, ServerError, { id: string; name: string }>(
    ['deleteCompositeSlo'],
    ({ id }) => {
      return http.delete(`/api/observability/slo_composites/${encodeURIComponent(id)}`);
    },
    {
      onSuccess: (_data, { name }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.compositeLists(), exact: false });
        toasts.addSuccess({
          title: toMountPoint(
            <span>
              {i18n.translate('xpack.slo.compositeSloDelete.successNotification', {
                defaultMessage: 'Deleted composite SLO "{name}"',
                values: { name },
              })}
            </span>,
            { i18n: i18nStart, theme }
          ),
        });
      },
      onError: (error, { name }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.compositeSloDelete.errorNotification', {
            defaultMessage: 'Failed to delete composite SLO "{name}"',
            values: { name },
          }),
        });
      },
    }
  );
}
