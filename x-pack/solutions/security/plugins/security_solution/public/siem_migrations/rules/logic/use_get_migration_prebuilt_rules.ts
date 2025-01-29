/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';
import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { GetRuleMigrationPrebuiltRulesResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH } from '../../../../common/siem_migrations/constants';
import { getRuleMigrationsPrebuiltRules } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import * as i18n from './translations';

export const useGetMigrationPrebuiltRules = (migrationId: string) => {
  const { addError } = useAppToasts();

  const SPECIFIC_MIGRATIONS_PREBUILT_RULES_PATH = replaceParams(
    SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH,
    {
      migration_id: migrationId,
    }
  );

  return useQuery<GetRuleMigrationPrebuiltRulesResponse>(
    ['GET', SPECIFIC_MIGRATIONS_PREBUILT_RULES_PATH],
    async ({ signal }) => {
      return getRuleMigrationsPrebuiltRules({ migrationId, signal });
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_MIGRATION_PREBUILT_RULES_FAILURE });
      },
    }
  );
};
