/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../common/siem_migrations/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

export const DELETE_MIGRATION_RULE_MUTATION_KEY = ['DELETE', SIEM_RULE_MIGRATION_PATH];

export const useDeleteMigration = (migrationId: string) => {
  const { addError, addSuccess } = useAppToasts();
  const rulesMigrationService = useKibana().services.siemMigrations.rules;

  return useMutation({
    mutationFn: () => rulesMigrationService.deleteMigration(migrationId),
    mutationKey: DELETE_MIGRATION_RULE_MUTATION_KEY,
    onSuccess: () => {
      addSuccess(i18n.DELETE_MIGRATION_SUCCESS);
    },
    onError: (error) => {
      addError(error, { title: i18n.DELETE_MIGRATION_FAILURE });
    },
  });
};
