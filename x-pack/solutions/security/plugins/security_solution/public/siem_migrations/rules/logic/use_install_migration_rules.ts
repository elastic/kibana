/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { SIEM_RULE_MIGRATION_INSTALL_PATH } from '../../../../common/siem_migrations/constants';
import type { InstallMigrationRulesResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { installMigrationRules } from '../api';

export const INSTALL_MIGRATION_RULES_MUTATION_KEY = ['POST', SIEM_RULE_MIGRATION_INSTALL_PATH];

export const useInstallMigrationRules = (migrationId: string) => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<InstallMigrationRulesResponse, Error, { ids?: string[]; enabled?: boolean }>(
    ({ ids, enabled }) => installMigrationRules({ migrationId, ids, enabled }),
    {
      mutationKey: INSTALL_MIGRATION_RULES_MUTATION_KEY,
      onSuccess: ({ installed }) => {
        addSuccess(i18n.INSTALL_MIGRATION_RULES_SUCCESS(installed));
      },
      onError: (error) => {
        addError(error, { title: i18n.INSTALL_MIGRATION_RULES_FAILURE });
      },
      onSettled: () => {
        invalidateGetRuleMigrations(migrationId);
        invalidateGetMigrationTranslationStats(migrationId);
      },
    }
  );
};
