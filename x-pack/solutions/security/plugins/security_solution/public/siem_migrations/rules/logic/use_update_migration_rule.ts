/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  RuleMigration,
  UpdateRuleMigrationData,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_PATH } from '../../../../common/siem_migrations/constants';
import type { UpdateRuleMigrationResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { updateMigrationRules } from '../api';
import { useTranslatedRuleTelemetry } from '../hooks/use_translated_rule_telemetry';

export const UPDATE_MIGRATION_RULE_MUTATION_KEY = ['PUT', SIEM_RULE_MIGRATIONS_PATH];

export const useUpdateMigrationRule = (ruleMigration: RuleMigration) => {
  const { addError } = useAppToasts();

  const migrationId = ruleMigration.migration_id;

  const { reportTranslatedRuleUpdate } = useTranslatedRuleTelemetry();
  const reportTelemetry = useCallback(
    (error?: Error) => {
      reportTranslatedRuleUpdate({
        migrationId,
        ruleMigrationId: ruleMigration.id,
        result: error ? 'failed' : 'success',
        errorMessage: error?.message,
      });
    },
    [migrationId, reportTranslatedRuleUpdate, ruleMigration.id]
  );

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<UpdateRuleMigrationResponse, Error, UpdateRuleMigrationData>(
    (ruleUpdateData) => updateMigrationRules({ rulesToUpdate: [ruleUpdateData] }),
    {
      mutationKey: UPDATE_MIGRATION_RULE_MUTATION_KEY,
      onSuccess: () => reportTelemetry(),
      onError: (error) => {
        addError(error, { title: i18n.UPDATE_MIGRATION_RULES_FAILURE });
        reportTelemetry(error);
      },
      onSettled: () => {
        invalidateGetRuleMigrations(migrationId);
        invalidateGetMigrationTranslationStats(migrationId);
      },
    }
  );
};
