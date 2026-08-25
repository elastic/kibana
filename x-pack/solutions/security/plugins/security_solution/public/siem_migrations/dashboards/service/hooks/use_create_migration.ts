/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { CreateDashboardMigrationDashboardsRequestBody } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from '../../../common/service';
import type { DashboardMigrationStats } from '../../types';
import { MigrationSource } from '../../../common/types';

export const DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.createDashboardSuccess.title',
  { defaultMessage: 'Dashboard migration created successfully' }
);
export const DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION = (dashboards: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboards.service.createDashboardSuccess.description',
    { defaultMessage: '{dashboards} dashboards uploaded', values: { dashboards } }
  );
export const DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.createDashboardError',
  { defaultMessage: 'Failed to upload dashboards file' }
);

export type CreateMigration = (
  migrationName: string,
  dashboards: CreateDashboardMigrationDashboardsRequestBody
) => void;
export type OnSuccess = (migrationStats: DashboardMigrationStats) => void;

export const useCreateMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const createMigration = useCallback<CreateMigration>(
    (migrationName, dashboards, vendor = MigrationSource.SPLUNK) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const migrationId = await siemMigrations.dashboards.createDashboardMigration(
            dashboards,
            migrationName,
            vendor
          );
          const stats = await siemMigrations.dashboards.api.getDashboardMigrationStats({
            migrationId,
          });

          notifications.toasts.addSuccess({
            title: DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE,
            text: DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION(dashboards.length),
          });
          onSuccess?.(stats);
          dispatch({ type: 'success' });
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.dashboards, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, createMigration };
};
