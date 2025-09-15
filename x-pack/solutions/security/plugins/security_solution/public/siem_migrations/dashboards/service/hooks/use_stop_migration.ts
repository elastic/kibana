/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from '../../../common/service';

export const DASHBOARDS_DATA_INPUT_STOP_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.stopMigrationSuccess',
  { defaultMessage: 'Migration stopped successfully.' }
);
export const DASHBOARDS_DATA_INPUT_STOP_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.stopMigrationError',
  { defaultMessage: 'Error stopping migration.' }
);

export type StopMigration = (migrationId: string) => void;
export type OnSuccess = () => void;

export const useStopMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const stopMigration = useCallback<StopMigration>(
    (migrationId) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const { stopped } = await siemMigrations.dashboards.stopDashboardMigration(migrationId);

          if (stopped) {
            notifications.toasts.addSuccess(DASHBOARDS_DATA_INPUT_STOP_MIGRATION_SUCCESS);
          }
          dispatch({ type: 'success' });
          onSuccess?.();
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: DASHBOARDS_DATA_INPUT_STOP_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.dashboards, onSuccess, notifications.toasts]
  );

  return { isLoading: state.loading, error: state.error, stopMigration };
};
