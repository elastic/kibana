/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { PostHealthScanResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

interface Props {
  onSuccess?: (scanId: string) => void;
}

export function useScheduleHealthScan(props: Props = {}) {
  const { onSuccess } = props;
  const {
    notifications: { toasts },
  } = useKibana().services;

  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<PostHealthScanResponse, ServerError, { force?: boolean } | undefined>(
    ['scheduleHealthScan'],
    (params) => {
      return sloClient.fetch('POST /internal/observability/slos/_health/scans', {
        params: {
          body: params ?? {},
        },
      });
    },
    {
      onError: (error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.slo.healthScan.scheduleErrorNotification', {
            defaultMessage: 'Failed to schedule health scan',
          }),
        });
      },
      onSuccess: (response) => {
        if (response?.status === 'scheduled') {
          toasts.addSuccess(
            i18n.translate('xpack.slo.healthScan.scheduleSuccessNotification', {
              defaultMessage: 'Health scan scheduled',
            })
          );
        } else {
          queryClient.invalidateQueries({ queryKey: sloKeys.allHealthScans(), exact: false });
        }
        onSuccess?.(response.scanId);
      },
    }
  );
}
