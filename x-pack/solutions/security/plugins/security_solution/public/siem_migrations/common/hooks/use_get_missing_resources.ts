/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useReducer } from 'react';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { SiemMigrationResourceBase } from '../../../../common/siem_migrations/model/common.gen';
import { initialState, reducer } from '../service';

export const GET_MISSING_RESOURCES_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.getMissingResourcesError',
  { defaultMessage: 'Failed to fetch missing macros & lookups' }
);

export type GetMissingResources = (migrationId: string) => void;
export type OnSuccess = (missingResources: SiemMigrationResourceBase[]) => void;

export const useGetMissingResources = (migrationType: MigrationType, onSuccess: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const getMissingResourcesFn = useCallback(
    (migrationId: string) => {
      if (migrationType === 'rule') {
        return siemMigrations.rules.api.getMissingResources({ migrationId });
      } else {
        return siemMigrations.dashboards.api.getDashboardMigrationMissingResources({ migrationId });
      }
    },
    [siemMigrations, migrationType]
  );

  const getMissingResources = useCallback<GetMissingResources>(
    (migrationId) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const missingResources = await getMissingResourcesFn(migrationId);
          onSuccess(missingResources);
          dispatch({ type: 'success' });
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: GET_MISSING_RESOURCES_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [notifications.toasts, onSuccess, getMissingResourcesFn]
  );

  return {
    isLoading: state.loading,
    error: state.error,
    getMissingResources,
  };
};
