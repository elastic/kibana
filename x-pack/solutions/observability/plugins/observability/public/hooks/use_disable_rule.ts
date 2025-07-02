/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../utils/kibana_react';

export function useDisableRule() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryClient = useQueryClient();

  const disableRule = useMutation<string, string, { id: string; untrack: boolean }>(
    ['disableRule'],
    ({ id, untrack }) => {
      const body = JSON.stringify({
        ...(untrack ? { untrack } : {}),
      });
      try {
        return http.post(`/api/alerting/rule/${id}/_disable`, { body });
      } catch (e) {
        throw new Error(`Unable to parse id: ${e}`);
      }
    },
    {
      onError: (_err) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.rules.disableErrorModal.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to disable rule',
            }
          )
        );
      },

      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['fetchRule', variables.id], exact: false });
        toasts.addSuccess(
          i18n.translate(
            'xpack.observability.rules.disableConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Disabled rule',
            }
          )
        );
      },
    }
  );

  return disableRule;
}
