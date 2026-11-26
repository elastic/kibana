/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  SCHEDULED_REPORT_DELETE_ENDPOINT,
  SCHEDULED_REPORT_RUN_ENDPOINT,
  SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
  type ScheduledReport,
} from '../../../../common/types/scheduled_reports';
import { useApiClient } from '../../../hooks/use_api_client';
import { useKibanaServices } from '../../../hooks/use_kibana_services';

export interface ScheduledReportActions {
  setEnabled: (report: ScheduledReport, enabled: boolean) => Promise<void>;
  run: (report: ScheduledReport) => Promise<void>;
  remove: (report: ScheduledReport) => Promise<void>;
}

/** Toggles, runs, and deletes a scheduled report via Digital Experience routes. */
export const useScheduledReportActions = (
  serviceName: string,
  onChange: () => void
): ScheduledReportActions => {
  const apiClient = useApiClient();
  const {
    notifications: { toasts },
  } = useKibanaServices();

  const setEnabled = useCallback(
    async ({ id, name }: ScheduledReport, enabled: boolean) => {
      try {
        await apiClient.fetch(SCHEDULED_REPORT_SET_ENABLED_ENDPOINT, {
          params: { path: { serviceName, scheduleId: id }, body: { enabled } },
        });
        toasts.addSuccess(
          enabled
            ? i18n.translate('xpack.digitalExperience.reports.scheduled.enabledToast', {
                defaultMessage: 'Enabled {name}',
                values: { name },
              })
            : i18n.translate('xpack.digitalExperience.reports.scheduled.disabledToast', {
                defaultMessage: 'Disabled {name}',
                values: { name },
              })
        );
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.digitalExperience.reports.scheduled.toggleError', {
            defaultMessage: 'Could not update {name}',
            values: { name },
          }),
        });
      }
      onChange();
    },
    [apiClient, serviceName, toasts, onChange]
  );

  const run = useCallback(
    async ({ id, name }: ScheduledReport) => {
      try {
        await apiClient.fetch(SCHEDULED_REPORT_RUN_ENDPOINT, {
          params: { path: { serviceName, scheduleId: id } },
        });
        toasts.addSuccess(
          i18n.translate('xpack.digitalExperience.reports.scheduled.runToast', {
            defaultMessage: 'Started {name}',
            values: { name },
          })
        );
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.digitalExperience.reports.scheduled.runError', {
            defaultMessage: 'Could not run {name}',
            values: { name },
          }),
        });
      }
      onChange();
    },
    [apiClient, serviceName, toasts, onChange]
  );

  const remove = useCallback(
    async ({ id, name }: ScheduledReport) => {
      try {
        await apiClient.fetch(SCHEDULED_REPORT_DELETE_ENDPOINT, {
          params: { path: { serviceName, scheduleId: id } },
        });
        toasts.addSuccess(
          i18n.translate('xpack.digitalExperience.reports.scheduled.deleteToast', {
            defaultMessage: 'Deleted {name}',
            values: { name },
          })
        );
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.digitalExperience.reports.scheduled.deleteError', {
            defaultMessage: 'Could not delete {name}',
            values: { name },
          }),
        });
      }
      onChange();
    },
    [apiClient, serviceName, toasts, onChange]
  );

  return { setEnabled, run, remove };
};
