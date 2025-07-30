/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { initialState, asyncReducer } from '../../../common/utils/api_request_reducer';

export const RULES_DATA_INPUT_STOP_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.stopMigrationSuccess',
  { defaultMessage: 'Migration stopped successfully.' }
);
export const RULES_DATA_INPUT_STOP_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.stopMigrationError',
  { defaultMessage: 'Error stopping migration.' }
);

export type StopMigration = (migrationId: string) => void;
export type OnSuccess = () => void;

export const useStopMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(asyncReducer, initialState);

  const stopMigration = useCallback<StopMigration>(
    (migrationId) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const { stopped } = await siemMigrations.rules.stopRuleMigration(migrationId);

          if (stopped) {
            notifications.toasts.addSuccess(RULES_DATA_INPUT_STOP_MIGRATION_SUCCESS);
          }
          dispatch({ type: 'success' });
          onSuccess?.();
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: RULES_DATA_INPUT_STOP_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.rules, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, stopMigration };
};
