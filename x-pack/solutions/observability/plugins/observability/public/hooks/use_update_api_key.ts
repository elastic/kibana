/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../utils/kibana_react';

export function useUpdateAPIKey() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryClient = useQueryClient();

  const updateAPIKey = useMutation<string, string, { id: string }>(
    ['updateAPIKey'],
    ({ id }) => {
      try {
        return http.post(`/api/alerting/rule/${id}/_update_api_key`);
      } catch (e) {
        throw new Error(`Unable to parse id: ${e}`);
      }
    },
    {
      onError: (_err) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.rules.updateAPIKey.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to update API key for rule',
            }
          )
        );
      },

      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['fetchRule', variables.id], exact: false });
        toasts.addSuccess(
          i18n.translate(
            'xpack.observability.rules.updateAPIKey.successNotification.descriptionText',
            {
              defaultMessage: 'Updated API key for rule',
            }
          )
        );
      },
    }
  );

  return updateAPIKey;
}
