/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../common/siem_migrations/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const DELETE_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.deleteMigrationSuccess',
  {
    defaultMessage: 'Migration deleted',
  }
);

export const DELETE_MIGRATION_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.deleteMigrationFailDescription',
  {
    defaultMessage: 'Failed to delete migration',
  }
);

export const DELETE_MIGRATION_RULE_MUTATION_KEY = ['DELETE', SIEM_RULE_MIGRATION_PATH];

export const useDeleteMigration = (migrationId: string, migrationType: MigrationType) => {
  const { addError, addSuccess } = useAppToasts();
  const { siemMigrations } = useKibana().services;
  const migrationService =
    migrationType === 'rule' ? siemMigrations.rules : siemMigrations.dashboards;

  return useMutation({
    mutationFn: () => migrationService.deleteMigration(migrationId),
    onSuccess: () => {
      addSuccess(DELETE_MIGRATION_SUCCESS);
    },
    onError: (error) => {
      addError(error, { title: DELETE_MIGRATION_FAILURE });
    },
  });
};
