/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { BulkPurgeRollupInput, BulkPurgeRollupResponse } from '@kbn/slo-schema';
import { useMutation } from '@tanstack/react-query';

import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function usePurgeRollupData({ name, onConfirm }: { name: string; onConfirm?: () => void }) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<BulkPurgeRollupResponse, ServerError, BulkPurgeRollupInput>(
    ['purgeRollupData'],
    ({ purgePolicy, force, list }) => {
      return sloClient.fetch('POST /api/observability/slos/_bulk_purge_rollup 2023-10-31', {
        params: {
          body: {
            purgePolicy,
            force,
            list,
          },
        },
      });
    },
    {
      onError: (error) => {
        let errorMessage = error.body?.message ?? error.message;
        if (errorMessage.includes('At least one SLO')) {
          errorMessage = i18n.translate('xpack.slo.purge.requestErrorNotification', {
            defaultMessage:
              'The provided purge policy is invalid. {name} has a time window that is longer than the provided purge policy.',
            values: { name },
          });
        }

        toasts.addError(new Error(errorMessage), {
          title: i18n.translate('xpack.slo.purge.errorNotification', {
            defaultMessage: 'Failed to schedule purge of rollup data for {name}',
            values: { name },
          }),
        });
      },
      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate('xpack.slo.purge.successNotification', {
            defaultMessage: 'Purge of rollup data scheduled for {name}',
            values: { name },
          })
        );
        onConfirm?.();
      },
    }
  );
}
