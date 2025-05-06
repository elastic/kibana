/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../utils/kibana_react';

export function useUnlinkDashboard(initialData: any) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const unlinkDashboard = useMutation<string, string, { ruleId: string; dashboardId: string }>(
    ['unlinkDashboard'],
    ({ ruleId, dashboardId }) => {
      try {
        const updatedData = {
          name: initialData.name,
          tags: initialData.tags,
          params: initialData.params,
          schedule: initialData.schedule,
          actions: initialData.actions,
          throttle: initialData.throttle,
          notify_when: initialData.notifyWhen,
          artifacts: {
            ...initialData.artifacts,
            dashboards: initialData.artifacts.dashboards.filter(
              (dashboard) => dashboard.id !== dashboardId
            ),
          },
        };
        return http.put(`/api/alerting/rule/${ruleId}`, {
          method: 'PUT',
          body: JSON.stringify(updatedData),
        });
      } catch (e) {
        throw new Error(`Unable to parse id: ${e}`);
      }
    },
    {
      onError: (_err) => {
        console.error('Failed to unlink dashboard');
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.relatedDashboards.unlinkConfirmationModal.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to unlink dashboard',
            }
          )
        );
      },
      onSuccess: () => {
        console.log('Unlinked dashboard');
        toasts.addSuccess(
          i18n.translate(
            'xpack.observability.relatedDashboards.unlinkConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Removed dashboard from linked dashboards',
            }
          )
        );
      },
    }
  );

  return unlinkDashboard;
}
