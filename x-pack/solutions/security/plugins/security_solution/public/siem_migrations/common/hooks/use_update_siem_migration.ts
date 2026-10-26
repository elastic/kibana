/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import type { UpdateRuleMigrationRequestBody } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { UpdateDashboardMigrationRequestBody } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';

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
  const { siemMigrations } = useKibana().services;

  const updateMigration = useCallback(
    (params: UpdateMigrationArgs<T>) => {
      if (migrationType === 'rule') {
        return siemMigrations.rules.api.updateMigration(params);
      } else {
        return siemMigrations.dashboards.api.updateDashboardMigration(params);
      }
    },
    [siemMigrations, migrationType]
  );

  return useMutation<void, Error, UpdateMigrationArgs<T>>({
    mutationKey: ['siemMigration', migrationType, 'update'],
    mutationFn: async (params) => {
      return updateMigration(params);
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
