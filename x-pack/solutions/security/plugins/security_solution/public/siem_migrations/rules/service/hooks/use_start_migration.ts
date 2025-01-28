/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { SiemMigrationRetryFilter } from '../../../../../common/siem_migrations/constants';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';

export const RULES_DATA_INPUT_START_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.startMigrationSuccess',
  { defaultMessage: 'Migration started successfully.' }
);
export const RULES_DATA_INPUT_START_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.startMigrationError',
  { defaultMessage: 'Error starting migration.' }
);

export type StartMigration = (migrationId: string, retry?: SiemMigrationRetryFilter) => void;
export type OnSuccess = () => void;

export const useStartMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const startMigration = useCallback<StartMigration>(
    (migrationId, retry) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const { started } = await siemMigrations.rules.startRuleMigration(migrationId, retry);

          if (started) {
            notifications.toasts.addSuccess(RULES_DATA_INPUT_START_MIGRATION_SUCCESS);
          }
          dispatch({ type: 'success' });
          onSuccess?.();
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: RULES_DATA_INPUT_START_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.rules, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, startMigration };
};
