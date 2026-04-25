/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { type PurgeInstancesInput, type PurgeInstancesResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function usePurgeInstances({ onConfirm }: { onConfirm?: () => void } = {}) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<PurgeInstancesResponse, ServerError, PurgeInstancesInput>(
    ['bulkPurgeSummary'],
    ({ force, staleDuration, list }) => {
      return sloClient.fetch('POST /api/observability/slos/_purge_instances', {
        params: {
          body: {
            staleDuration,
            force,
            list,
          },
        },
      });
    },
    {
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.bulkPurgeSummary.errorNotification', {
            defaultMessage: 'Failed to schedule purge of stale SLO instances',
          }),
        });
      },
      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate('xpack.slo.bulkPurgeSummary.successNotification', {
            defaultMessage: 'Purge of stale SLO instances scheduled',
          })
        );
        onConfirm?.();
      },
    }
  );
}
