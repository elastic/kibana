/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../utils/kibana_react';

export function useRunRule() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryClient = useQueryClient();

  const runRule = useMutation<string, string, { id: string }>(
    ['runRule'],
    ({ id }) => {
      try {
        return http.post(`/internal/alerting/rule/${id}/_run_soon`);
      } catch (e) {
        throw new Error(`Unable to parse id: ${e}`);
      }
    },
    {
      onError: (_err) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.rules.runErrorModal.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to schedule rule',
            }
          )
        );
      },

      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['fetchRule', variables.id], exact: false });
        toasts.addSuccess(
          i18n.translate('xpack.observability.rules.run.successNotification.descriptionText', {
            defaultMessage: 'Your rule is scheduled to run',
          })
        );
      },
    }
  );

  return runRule;
}
