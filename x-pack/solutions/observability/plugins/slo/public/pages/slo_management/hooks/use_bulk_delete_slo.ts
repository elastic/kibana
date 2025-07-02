/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { BulkDeleteResponse, SLODefinitionResponse } from '@kbn/slo-schema';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useBulkOperation } from '../context/bulk_operation';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useBulkDeleteSlo({ onConfirm }: { onConfirm?: () => void } = {}) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const bulkOperation = useBulkOperation();

  return useMutation<
    BulkDeleteResponse,
    ServerError,
    { items: Array<Pick<SLODefinitionResponse, 'id'>> }
  >(
    ['bulkDeleteSlo'],
    ({ items }) => {
      return sloClient.fetch('POST /api/observability/slos/_bulk_delete 2023-10-31', {
        params: {
          body: {
            list: items.map(({ id }) => id),
          },
        },
      });
    },
    {
      onError: (error, { items }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.bulkDelete.errorNotification', {
            defaultMessage: 'Failed to schedule deletion of {count} SLOs',
            values: { count: items.length },
          }),
        });
      },
      onSuccess: (response, { items }) => {
        bulkOperation.register({ taskId: response.taskId, operation: 'delete', items });

        toasts.addSuccess(
          i18n.translate('xpack.slo.bulkDelete.successNotification', {
            defaultMessage: 'Bulk delete of {count} SLOs scheduled',
            values: { count: items.length },
          })
        );

        onConfirm?.();
      },
    }
  );
}
