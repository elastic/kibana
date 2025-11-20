/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { RepairInput, RepairResponse } from '@kbn/slo-schema';

import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';
import { sloKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useRepairSlo({ name, onConfirm }: { name: string; onConfirm?: () => void }) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<RepairResponse, ServerError, RepairInput>(
    ['repairSlo'],
    ({ list }) => {
      return sloClient.fetch('POST /api/observability/slos/_repair 2023-10-31', {
        params: {
          body: {
            list,
          },
        },
      });
    },
    {
      onError: (error) => {
        const errorMessage = error.body?.message ?? error.message;

        toasts.addError(new Error(errorMessage), {
          title: i18n.translate('xpack.slo.repair.errorNotification', {
            defaultMessage: 'Failed to repair {name}',
            values: { name },
          }),
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [...sloKeys.all, 'health'], exact: false });

        toasts.addSuccess(
          i18n.translate('xpack.slo.repair.successNotification', {
            defaultMessage: 'Repaired {name}',
            values: { name },
          })
        );
        onConfirm?.();
      },
    }
  );
}
