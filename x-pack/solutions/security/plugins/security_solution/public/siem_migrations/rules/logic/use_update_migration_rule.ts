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
import { SIEM_RULE_MIGRATION_PATH } from '../../../../common/siem_migrations/constants';
import type { UpdateRuleMigrationResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import * as i18n from './translations';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { updateMigrationRules } from '../api';

export const UPDATE_MIGRATION_RULE_MUTATION_KEY = ['PUT', SIEM_RULE_MIGRATION_PATH];

export const useUpdateMigrationRule = (ruleMigration: RuleMigration) => {
  const { addError } = useAppToasts();
  const { telemetry } = useKibana().services.siemMigrations.rules;

  const migrationId = ruleMigration.migration_id;

  const reportTelemetry = useCallback(
    (error?: Error) => {
      telemetry.reportTranslatedRuleUpdate({ ruleMigration, error });
    },
    [telemetry, ruleMigration]
  );

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<UpdateRuleMigrationResponse, Error, UpdateRuleMigrationData>(
    (ruleUpdateData) => updateMigrationRules({ migrationId, rulesToUpdate: [ruleUpdateData] }),
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
