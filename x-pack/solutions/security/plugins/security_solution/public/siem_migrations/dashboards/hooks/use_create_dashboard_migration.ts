/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { asyncReducer, initialState } from '../../common/utils/api_request_reducer';

export const DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.createRuleSuccess.title',
  { defaultMessage: 'Dashboard migration created successfully' }
);
export const DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboards.service.createRuleSuccess.description',
    { defaultMessage: '{count} dashboards uploaded', values: { count } }
  );
export const DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.service.createRuleError',
  { defaultMessage: 'Failed to upload dashboards file' }
);

interface RawDashboard {
  id: string;
  label: string;
  title: string;
  description: string;
  version: string;
  'eai:data': string;
  'eai:acl.app': string;
  'eai:acl.sharing': string;
  'eai:acl.owner': string;
}

export type CreateDashboardMigrationArgs = (
  migrationName: string,
  dashboards: RawDashboard[]
) => void;
export type OnSuccess = () => void;

export const useCreateDashboardMigration = (onSuccess: OnSuccess) => {
  const { notifications } = useKibana().services;
  const [state, dispatch] = useReducer(asyncReducer, initialState);

  const createMigration = useCallback<CreateDashboardMigrationArgs>(
    (migrationName, rules) => {
      (async () => {
        try {
          dispatch({ type: 'start' });

          notifications.toasts.addSuccess({
            title: DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE,
            text: DASHBOARDS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION(rules.length),
          });
          onSuccess?.();
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
    [notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, createMigration };
};
