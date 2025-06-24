/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';

export const GET_INTEGRATIONS_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.getIntegrationsError',
  { defaultMessage: 'Failed to fetch integrations' }
);

export type OnSuccess = (integrations: Record<string, RelatedIntegration>) => void;

export const useGetIntegrations = (onSuccess: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const getIntegrations = useCallback(() => {
    (async () => {
      try {
        dispatch({ type: 'start' });
        const integrations = await siemMigrations.rules.api.getIntegrations();

        onSuccess(integrations);
        dispatch({ type: 'success' });
      } catch (err) {
        const apiError = err.body ?? err;
        notifications.toasts.addError(apiError, { title: GET_INTEGRATIONS_ERROR });
        dispatch({ type: 'error', error: apiError });
      }
    })();
  }, [siemMigrations.rules.api, notifications.toasts, onSuccess]);

  return { isLoading: state.loading, error: state.error, getIntegrations };
};
