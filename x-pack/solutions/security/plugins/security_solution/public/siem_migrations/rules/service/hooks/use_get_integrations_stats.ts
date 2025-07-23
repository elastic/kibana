/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleMigrationAllIntegrationsStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';

export const GET_INTEGRATIONS_STATS_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.getIntegrationsStatsError',
  { defaultMessage: 'Failed to fetch integrations stats' }
);

export type OnSuccess = (integrationsStats: RuleMigrationAllIntegrationsStats) => void;

export const useGetIntegrationsStats = (onSuccess: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const getIntegrationsStats = useCallback(() => {
    (async () => {
      try {
        dispatch({ type: 'start' });
        const integrationsStats = await siemMigrations.rules.api.getIntegrationsStats();

        onSuccess(integrationsStats);
        dispatch({ type: 'success' });
      } catch (err) {
        const apiError = err.body ?? err;
        notifications.toasts.addError(apiError, { title: GET_INTEGRATIONS_STATS_ERROR });
        dispatch({ type: 'error', error: apiError });
      }
    })();
  }, [siemMigrations.rules.api, notifications.toasts, onSuccess]);

  return { isLoading: state.loading, error: state.error, getIntegrationsStats };
};
