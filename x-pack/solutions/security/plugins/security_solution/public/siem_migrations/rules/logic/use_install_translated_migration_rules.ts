/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { InstallTranslatedMigrationRulesResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH } from '../../../../common/siem_migrations/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { installTranslatedMigrationRules } from '../api';

export const INSTALL_ALL_MIGRATION_RULES_MUTATION_KEY = [
  'POST',
  SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH,
];

export const useInstallTranslatedMigrationRules = (migrationId: string) => {
  const { addError } = useAppToasts();

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules(migrationId);
  const invalidateGetMigrationTranslationStats =
    useInvalidateGetMigrationTranslationStats(migrationId);

  return useMutation<InstallTranslatedMigrationRulesResponse, Error>(
    () => installTranslatedMigrationRules({ migrationId }),
    {
      mutationKey: INSTALL_ALL_MIGRATION_RULES_MUTATION_KEY,
      onError: (error) => {
        addError(error, { title: i18n.INSTALL_MIGRATION_RULES_FAILURE });
      },
      onSettled: () => {
        invalidateGetRuleMigrations();
        invalidateGetMigrationTranslationStats();
      },
    }
  );
};
