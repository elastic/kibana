/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';
import type { SiemMigrationRetryFilter } from '../../../../../common/siem_migrations/constants';

export const RETRY_RULE_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.retryMigrationRulesSuccess',
  { defaultMessage: 'Retry rule migration started successfully.' }
);
export const RETRY_RULE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.retryMigrationRulesError',
  { defaultMessage: 'Error retrying a rule migration.' }
);

export type RetryRuleMigration = (migrationId: string, filter?: SiemMigrationRetryFilter) => void;
export type OnSuccess = () => void;

export const useRetryRuleMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const retryRuleMigration = useCallback<RetryRuleMigration>(
    (migrationId, filter) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          await siemMigrations.rules.retryRuleMigration(migrationId, filter);

          notifications.toasts.addSuccess(RETRY_RULE_MIGRATION_SUCCESS);
          dispatch({ type: 'success' });
          onSuccess?.();
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, { title: RETRY_RULE_MIGRATION_ERROR });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.rules, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, retryRuleMigration };
};
