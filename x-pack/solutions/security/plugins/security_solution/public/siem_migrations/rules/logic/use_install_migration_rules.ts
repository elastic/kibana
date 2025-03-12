/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { RuleMigrationTranslationStats } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SIEM_RULE_MIGRATION_INSTALL_PATH } from '../../../../common/siem_migrations/constants';
import type { InstallMigrationRulesResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { installMigrationRules } from '../api';

export const INSTALL_MIGRATION_RULES_MUTATION_KEY = ['POST', SIEM_RULE_MIGRATION_INSTALL_PATH];

interface InstallMigrationRulesParams {
  ids?: string[];
  enabled?: boolean;
}

export const useInstallMigrationRules = (
  migrationId: string,
  translationStats?: RuleMigrationTranslationStats
) => {
  const { addError, addSuccess } = useAppToasts();
  const { telemetry } = useKibana().services.siemMigrations.rules;

  const reportTelemetry = useCallback(
    ({ ids, enabled = false }: InstallMigrationRulesParams, error?: Error) => {
      const count = ids?.length ?? translationStats?.rules.success.installable ?? 0;
      telemetry.reportTranslatedRuleBulkInstall({ migrationId, enabled, count, error });
    },
    [migrationId, telemetry, translationStats?.rules.success.installable]
  );

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<InstallMigrationRulesResponse, Error, InstallMigrationRulesParams>(
    ({ ids, enabled }) => installMigrationRules({ migrationId, ids, enabled }),
    {
      mutationKey: INSTALL_MIGRATION_RULES_MUTATION_KEY,
      onSuccess: ({ installed }, variables) => {
        addSuccess(i18n.INSTALL_MIGRATION_RULES_SUCCESS(installed));
        reportTelemetry(variables);
      },
      onError: (error, variables) => {
        addError(error, { title: i18n.INSTALL_MIGRATION_RULES_FAILURE });
        reportTelemetry(variables, error);
      },
      onSettled: () => {
        invalidateGetRuleMigrations(migrationId);
        invalidateGetMigrationTranslationStats(migrationId);
      },
    }
  );
};
