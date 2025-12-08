/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleMigrationEnhanceRuleRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from '../../../common/service';

export const ENHANCE_RULES_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.enhanceRulesSuccess.title',
  { defaultMessage: 'Enhancement added successfully' }
);

export const ENHANCE_RULES_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.enhanceRulesError',
  { defaultMessage: 'Failed to add enhancement' }
);

export type EnhanceRules = (params: {
  migrationId: string;
  body: RuleMigrationEnhanceRuleRequestBody;
}) => Promise<boolean>;

export type OnSuccess = () => void;

export const useEnhanceRules = (onSuccess?: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const enhanceRules = useCallback<EnhanceRules>(
    async ({ migrationId, body }) => {
      try {
        dispatch({ type: 'start' });
        await siemMigrations.rules.api.enhanceRules({ migrationId, body });
        notifications.toasts.addSuccess({
          title: ENHANCE_RULES_SUCCESS_TITLE,
        });
        onSuccess?.();
        dispatch({ type: 'success' });
        return true;
      } catch (err) {
        const apiError = err.body ?? err;
        notifications.toasts.addError(apiError, {
          title: ENHANCE_RULES_ERROR,
        });
        dispatch({ type: 'error', error: apiError });
        return false;
      }
    },
    [siemMigrations.rules.api, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, enhanceRules };
};
