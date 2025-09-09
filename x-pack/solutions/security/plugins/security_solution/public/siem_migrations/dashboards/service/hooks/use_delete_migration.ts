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

export const DASHBOARDS_DELETE_MIGRATION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.deleteMigrationSuccess.title',
  { defaultMessage: 'Dashboard migration deleted successfully' }
);

export const DASHBOARDS_DELETE_MIGRATION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.deleteMigrationError.title',
  { defaultMessage: 'Failed to delete dashboard migration' }
);

export type DeleteMigration = (migrationId: string, onSuccess?: () => void) => void;

export const useDeleteMigration = () => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const deleteMigration = useCallback<DeleteMigration>(
    (migrationId, onSuccess) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          await siemMigrations.dashboards.api.deleteDashboardMigration({ migrationId });
          notifications.toasts.addSuccess({
            title: DASHBOARDS_DELETE_MIGRATION_SUCCESS_TITLE,
          });
          onSuccess?.();
          dispatch({ type: 'success' });
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: DASHBOARDS_DELETE_MIGRATION_ERROR_TITLE,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.dashboards, notifications.toasts]
  );

  return { isLoading: state.loading, error: state.error, deleteMigration };
};
