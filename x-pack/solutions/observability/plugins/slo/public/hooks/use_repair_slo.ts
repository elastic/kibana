/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { RepairActionsGroupResult } from '@kbn/slo-schema';
import type { SLODefinition } from '../../server/domain/models';
import { sloKeys } from './query_key_factory';
import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useRepairSlo({ id, name }: Pick<SLODefinition, 'id' | 'name'>) {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<RepairActionsGroupResult[], ServerError>(
    ['repairSlo'],
    () => {
      return sloClient.fetch('POST /api/observability/slos/_repair', {
        params: {
          body: {
            list: [id],
          },
        },
      });
    },
    {
      onError: (error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.slo.repair.errorNotification', {
            defaultMessage: 'Failed to repair {name}',
            values: { name },
          }),
        });
      },
      onSuccess: (response) => {
        const foundSLO = response.find(
          (result) => result.id && result.results.some((r) => r.status === 'success')
        );
        if (!foundSLO) {
          toasts.addError(new Error('Unknown error occurred while repairing SLO'), {
            title: i18n.translate('xpack.slo.repair.unknownError', {
              defaultMessage: 'Unknown error occurred while repairing {name}',
              values: { name },
            }),
          });
          return;
        }

        toasts.addSuccess(
          i18n.translate('xpack.slo.repair.successNotification', {
            defaultMessage: 'Repaired {name}',
            values: { name },
          })
        );

        queryClient.invalidateQueries({ queryKey: sloKeys.allDefinitions(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.allHealth(), exact: false });
      },
    }
  );
}
