/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import type { UpdateRuleMigrationRequestBody } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { UpdateDashboardMigrationRequestBody } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { updateMigration as updateRuleMigration } from '../../rules/api';
import { updateDashboardMigration } from '../../dashboards/api';

export type UpdateMigrationBody<T extends MigrationType> = T extends 'rule'
  ? UpdateRuleMigrationRequestBody
  : UpdateDashboardMigrationRequestBody;

export interface UpdateMigrationArgs<T extends MigrationType> {
  migrationId: string;
  body: UpdateMigrationBody<T>;
}

interface UseUpdateSiemMigrationOptions {
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}

export const UPDATE_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.updateMigration.success',
  { defaultMessage: 'Migration updated' }
);
export const UPDATE_MIGRATION_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.updateMigration.failure',
  { defaultMessage: 'Failed to update migration' }
);

export function useUpdateSiemMigration<T extends MigrationType>(
  migrationType: T,
  { onSuccess, onError }: UseUpdateSiemMigrationOptions = {}
) {
  const { addSuccess, addError } = useAppToasts();

  return useMutation<void, Error, UpdateMigrationArgs<T>>({
    mutationKey: ['siemMigration', migrationType, 'update'],
    mutationFn: async ({ migrationId, body }) => {
      if (migrationType === 'rule') {
        await updateRuleMigration({ migrationId, body: body as UpdateRuleMigrationRequestBody });
      } else {
        await updateDashboardMigration({
          migrationId,
          body: body as UpdateDashboardMigrationRequestBody,
        });
      }
    },
    onSuccess: () => {
      addSuccess(UPDATE_MIGRATION_SUCCESS);
      onSuccess?.();
    },
    onError: (e) => {
      addError(e, { title: UPDATE_MIGRATION_FAILURE });
      onError?.(e);
    },
  });
}
