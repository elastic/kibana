/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { CreateWorkflowMigrationWorkflowsRequestBody } from '../../../../../common/siem_migrations/workflows/types';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from '../../../common/service';
import type { WorkflowMigrationStats } from '../../types';

export const WORKFLOWS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.service.createWorkflowSuccess.title',
  { defaultMessage: 'Workflow migration created successfully' }
);
export const WORKFLOWS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION = (workflows: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.workflows.service.createWorkflowSuccess.description',
    { defaultMessage: '{workflows} workflows uploaded', values: { workflows } }
  );
export const WORKFLOWS_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.service.createWorkflowError',
  { defaultMessage: 'Failed to upload workflows file' }
);

export type CreateMigration = (
  migrationName: string,
  workflows: CreateWorkflowMigrationWorkflowsRequestBody
) => void;
export type OnSuccess = (migrationStats: WorkflowMigrationStats) => void;

export const useCreateMigration = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const createMigration = useCallback<CreateMigration>(
    (migrationName, workflows) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const migrationId = await siemMigrations.workflows.createWorkflowMigration(
            workflows,
            migrationName
          );
          const stats = await siemMigrations.workflows.api.getWorkflowMigrationStats({
            migrationId,
          });

          notifications.toasts.addSuccess({
            title: WORKFLOWS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE,
            text: WORKFLOWS_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION(workflows.length),
          });
          onSuccess?.(stats);
          dispatch({ type: 'success' });
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: WORKFLOWS_DATA_INPUT_CREATE_MIGRATION_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.workflows, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, createMigration };
};
