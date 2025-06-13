/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../common/siem_migrations/constants';
import type { GetRuleMigrationRequestParams } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { deleteMigration } from '../api';

export const DELETE_MIGRATION_RULE_MUTATION_KEY = ['DELETE', SIEM_RULE_MIGRATION_PATH];

export const useDeleteMigration = (migrationId: string, onSettled?: () => void) => {
  const { addError, addSuccess } = useAppToasts();

  return useMutation<unknown, Error, GetRuleMigrationRequestParams>(
    () => deleteMigration({ migrationId }),
    {
      mutationKey: DELETE_MIGRATION_RULE_MUTATION_KEY,
      onSuccess: () => {
        addSuccess(i18n.DELETE_MIGRATION_SUCCESS);
      },
      onError: (error) => {
        addError(error, { title: i18n.DELETE_MIGRATION_FAILURE });
      },
      onSettled,
    }
  );
};
