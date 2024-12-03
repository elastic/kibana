/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  CreateInvestigationItemParams,
  CreateInvestigationItemResponse,
} from '@kbn/investigation-shared';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useAddInvestigationItem() {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    CreateInvestigationItemResponse,
    ServerError,
    { investigationId: string; item: CreateInvestigationItemParams },
    { investigationId: string }
  >(
    ['addInvestigationItem'],
    ({ investigationId, item }) => {
      const body = JSON.stringify(item);
      return http.post<CreateInvestigationItemResponse>(
        `/api/observability/investigations/${investigationId}/items`,
        { body, version: '2023-10-31' }
      );
    },
    {
      onSuccess: (response, {}) => {
        toasts.addSuccess(
          i18n.translate('xpack.investigateApp.addInvestigationItem.successMessage', {
            defaultMessage: 'Item saved',
          })
        );
      },
      onError: (error, {}, context) => {
        toasts.addError(
          new Error(
            error.body?.message ??
              i18n.translate('xpack.investigateApp.addInvestigationItem.errorMessage', {
                defaultMessage: 'an error occurred',
              })
          ),
          {
            title: i18n.translate('xpack.investigateApp.addInvestigationItem.errorTitle', {
              defaultMessage: 'Error',
            }),
          }
        );
      },
    }
  );
}
