/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { BulkPurgeRollupInput, BulkPurgeRollupResponse } from '@kbn/slo-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useBulkPurgeRollupData() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<BulkPurgeRollupResponse, ServerError, BulkPurgeRollupInput>(
    ['bulkPurgeRollupData'],
    ({ purgePolicy, force, list }) => {
      try {
        return sloClient.fetch('POST /api/observability/slos/_bulk_purge_rollup 2023-10-31', {
          params: {
            body: {
              purgePolicy,
              force,
              list,
            },
          },
        });
      } catch (error) {
        return Promise.reject(
          i18n.translate('xpack.slo.bulkDelete.errorMessage', {
            defaultMessage:
              'Failed to bulk purge of rollup data for {count} SLOs, something went wrong: {error}',
            values: { error: String(error), count: list.length },
          })
        );
      }
    },
    {
      onError: (error, { list }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.bulkDelete.errorNotification', {
            defaultMessage: 'Failed to schedule bulk purge of rollup data for {count} SLOs',
            values: { count: list.length },
          }),
        });
      },
      onSuccess: (_, { list }) => {
        queryClient.invalidateQueries({ queryKey: ['slo', 'definitions'], exact: false });
        toasts.addSuccess(
          i18n.translate('xpack.slo.bulkDelete.successNotification', {
            defaultMessage: 'Bulk purge of rollup data for {count} SLOs scheduled',
            values: { count: list.length },
          })
        );
      },
    }
  );
}
