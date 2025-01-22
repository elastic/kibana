/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { useKibana } from './use_kibana';
import * as i18n from './translations';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../common/constants';
import type { InferenceEndpoint } from '../types';

interface MutationArgs {
  inferenceEndpoint: InferenceEndpoint;
}

export const useAddEndpoint = (onSuccess?: () => void, onError?: () => void) => {
  const queryClient = useQueryClient();
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;

  return useMutation(
    async ({ inferenceEndpoint }: MutationArgs) => {
      return await services.http.put<{}>(
        `/internal/inference_endpoint/endpoints/${inferenceEndpoint.config.taskType}/${inferenceEndpoint.config.inferenceId}`,
        {
          body: JSON.stringify(inferenceEndpoint),
        }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY]);
        toasts?.addSuccess({
          title: i18n.ENDPOINT_ADDED_SUCCESS,
        });
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: { body: KibanaServerError }) => {
        toasts?.addError(new Error(error.body.message), {
          title: i18n.ENDPOINT_CREATION_FAILED,
          toastMessage: error.body.message,
        });
        if (onError) {
          onError();
        }
      },
    }
  );
};
