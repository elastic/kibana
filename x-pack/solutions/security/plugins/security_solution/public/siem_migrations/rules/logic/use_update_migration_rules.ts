/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { UpdateRuleMigrationData } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_PATH } from '../../../../common/siem_migrations/constants';
import type { UpdateRuleMigrationResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { updateMigrationRules } from '../api';

export const UPDATE_MIGRATION_RULES_MUTATION_KEY = ['PUT', SIEM_RULE_MIGRATIONS_PATH];

export const useUpdateMigrationRules = (migrationId: string) => {
  const { addError } = useAppToasts();

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules(migrationId);
  const invalidateGetMigrationTranslationStats =
    useInvalidateGetMigrationTranslationStats(migrationId);

  return useMutation<UpdateRuleMigrationResponse, Error, UpdateRuleMigrationData[]>(
    (rulesToUpdate) => updateMigrationRules({ rulesToUpdate }),
    {
      mutationKey: UPDATE_MIGRATION_RULES_MUTATION_KEY,
      onError: (error) => {
        addError(error, { title: i18n.UPDATE_MIGRATION_RULES_FAILURE });
      },
      onSettled: () => {
        invalidateGetRuleMigrations();
        invalidateGetMigrationTranslationStats();
      },
    }
  );
};
