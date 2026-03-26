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
  BulkPurgeRollupInput,
  BulkPurgeRollupResponse,
  SLODefinitionResponse,
} from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

type Input = Omit<BulkPurgeRollupInput, 'list'> & { list: SLODefinitionResponse[] };

export function useBulkPurgeRollup({ onConfirm }: { onConfirm?: () => void } = {}) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<BulkPurgeRollupResponse, ServerError, Input>(
    ['bulkPurgeRollupData'],
    ({ purgePolicy, force, list }) => {
      return sloClient.fetch('POST /api/observability/slos/_bulk_purge_rollup 2023-10-31', {
        params: {
          body: {
            purgePolicy,
            force,
            list: list.map(({ id }) => id),
          },
        },
      });
    },
    {
      onError: (error, { list }) => {
        if (list.length === 1) {
          toasts.addError(new Error(error.body?.message ?? error.message), {
            title: i18n.translate('xpack.slo.useBulkPurgeRollup.singlePurgeErrorNotification', {
              defaultMessage: 'Failed to schedule purge of rollup data for {name}',
              values: { name: list[0].name },
            }),
          });
        } else {
          toasts.addError(new Error(error.body?.message ?? error.message), {
            title: i18n.translate('xpack.slo.useBulkPurgeRollup.bulkPurgeErrorNotification', {
              defaultMessage: 'Failed to schedule bulk purge of rollup data for {count} SLOs',
              values: { count: list.length },
            }),
          });
        }
      },
      onSuccess: (_, { list }) => {
        if (list.length === 1) {
          toasts.addSuccess(
            i18n.translate('xpack.slo.useBulkPurgeRollup.singlePurgeSuccessNotification', {
              defaultMessage: 'Purge of rollup data scheduled for {name}',
              values: { name: list[0].name },
            })
          );
        } else {
          toasts.addSuccess(
            i18n.translate('xpack.slo.useBulkPurgeRollup.bulkPurgeSuccessNotification', {
              defaultMessage: 'Bulk purge of rollup data scheduled for {count} SLOs',
              values: { count: list.length },
            })
          );
        }

        onConfirm?.();
      },
    }
  );
}
