/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';

export const GET_RELATED_INTEGRATIONS_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.getRelatedIntegrationsError',
  { defaultMessage: 'Failed to fetch related integrations' }
);

export const useGetRelatedIntegrations = (migrationId: string) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);
  const [integrations, setIntegrations] = useState<
    Record<string, RelatedIntegration> | undefined
  >();

  const getRelatedIntegrations = useCallback(() => {
    (async () => {
      try {
        dispatch({ type: 'start' });
        const results = await siemMigrations.rules.getRelatedIntegrations(migrationId);

        setIntegrations(results);
        dispatch({ type: 'success' });
      } catch (err) {
        setIntegrations(undefined);
        const apiError = err.body ?? err;
        notifications.toasts.addError(apiError, { title: GET_RELATED_INTEGRATIONS_ERROR });
        dispatch({ type: 'error', error: apiError });
      }
    })();
  }, [siemMigrations.rules, migrationId, notifications.toasts]);

  useEffect(() => {
    getRelatedIntegrations();
  }, [getRelatedIntegrations]);

  return { isLoading: state.loading, error: state.error, integrations };
};
