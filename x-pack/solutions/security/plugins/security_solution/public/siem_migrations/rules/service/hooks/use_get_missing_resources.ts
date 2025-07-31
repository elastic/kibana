/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';

export const RULES_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.getMissingResourcesError',
  { defaultMessage: 'Failed to fetch missing macros & lookups' }
);

export type GetMissingResources = (migrationId: string) => void;
export type OnSuccess = (missingResources: RuleMigrationResourceBase[]) => void;

export const useGetMissingResources = (onSuccess: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const getMissingResources = useCallback<GetMissingResources>(
    (migrationId) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const missingResources = await siemMigrations.rules.api.getMissingResources({
            migrationId,
          });

          onSuccess(missingResources);
          dispatch({ type: 'success' });
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: RULES_DATA_INPUT_CREATE_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.rules.api, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, getMissingResources };
};
