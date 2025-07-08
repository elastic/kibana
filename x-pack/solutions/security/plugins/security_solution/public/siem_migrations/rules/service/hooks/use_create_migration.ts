/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { CreateRuleMigrationRulesRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from './common/api_request_reducer';

export const RULES_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.createRuleSuccess.title',
  { defaultMessage: 'Rule migration created successfully' }
);
export const RULES_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION = (rules: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.service.createRuleSuccess.description',
    { defaultMessage: '{rules} rules uploaded', values: { rules } }
  );
export const RULES_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.createRuleError',
  { defaultMessage: 'Failed to upload rules file' }
);

export type CreateMigration = (
  migrationName: string,
  rules: CreateRuleMigrationRulesRequestBody
) => void;
export type OnSuccess = (migrationStats: RuleMigrationTaskStats) => void;

export const useCreateMigration = (onSuccess: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const createMigration = useCallback<CreateMigration>(
    (migrationName, rules) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          const migrationId = await siemMigrations.rules.createRuleMigration(rules, migrationName);
          const stats = await siemMigrations.rules.api.getRuleMigrationStats({ migrationId });

          notifications.toasts.addSuccess({
            title: RULES_DATA_INPUT_CREATE_MIGRATION_SUCCESS_TITLE,
            text: RULES_DATA_INPUT_CREATE_MIGRATION_SUCCESS_DESCRIPTION(rules.length),
          });
          onSuccess(stats);
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
    [siemMigrations.rules, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, createMigration };
};
