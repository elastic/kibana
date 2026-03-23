/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import type { MigrationSettingsBase } from '../../common/types';
import { initialState, reducer } from '../../common/service';
import type { DashboardMigrationStats } from '../types';

export const DASHBOARDS_DATA_INPUT_START_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.startMigrationSuccess',
  { defaultMessage: 'Migration started successfully.' }
);
export const DASHBOARDS_DATA_INPUT_START_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.startMigrationError',
  { defaultMessage: 'Error starting migration.' }
);

export type StartMigration = (
  migrationStats: DashboardMigrationStats,
  retry?: SiemMigrationRetryFilter,
  settings?: MigrationSettingsBase
) => void;

export type OnSuccess = () => void;

export const useStartMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const startMigration = useCallback<StartMigration>(
    (migrationStats, retry, settings) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const { started } = await siemMigrations.dashboards.startDashboardMigration({
            migrationId: migrationStats.id,
            vendor: migrationStats.vendor,
            retry,
            settings,
          });

          if (started) {
            notifications.toasts.addSuccess(DASHBOARDS_DATA_INPUT_START_MIGRATION_SUCCESS);
          }
          dispatch({ type: 'success' });
          onSuccess?.();
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: DASHBOARDS_DATA_INPUT_START_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.dashboards, onSuccess, notifications.toasts]
  );

  return { isLoading: state.loading, error: state.error, startMigration };
};
