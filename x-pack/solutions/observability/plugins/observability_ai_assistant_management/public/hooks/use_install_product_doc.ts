/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { PerformInstallResponse } from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useInstallProductDoc() {
  const {
    productDocBase,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<PerformInstallResponse, ServerError, void>(
    [REACT_QUERY_KEYS.INSTALL_PRODUCT_DOC],
    () => {
      return productDocBase!.installation.install();
    },
    {
      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.installProductDoc.successNotification',
            {
              defaultMessage: 'The Elastic documentation was successfully installed',
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS],
          refetchType: 'all',
        });
      },
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.installProductDoc.errorNotification',
            {
              defaultMessage: 'Something went wrong while installing the Elastic documentation',
            }
          ),
        });
      },
    }
  );
}
