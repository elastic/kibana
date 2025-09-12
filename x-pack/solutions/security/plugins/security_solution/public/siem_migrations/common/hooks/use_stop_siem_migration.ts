/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Generic stop migration hook for both rule and dashboard migrations using React Query.
 * Mirrors the structure of useStartSiemMigration for consistency.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { StopRuleMigrationResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { StopDashboardsMigrationResponse } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';

export const STOP_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.service.stopMigrationSuccess',
  { defaultMessage: 'Migration stopped successfully.' }
);
export const STOP_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.service.stopMigrationError',
  { defaultMessage: 'Error stopping migration.' }
);

interface StopArgs {
  migrationId: string;
}

interface UseStopOptions {
  onSuccess?: () => void;
}

export type StopMigrationResponse<T extends MigrationType> = T extends 'rule'
  ? StopRuleMigrationResponse
  : StopDashboardsMigrationResponse;

export function useStopSiemMigration<T extends MigrationType>(
  migrationType: T,
  { onSuccess }: UseStopOptions = {}
) {
  const { siemMigrations, notifications } = useKibana().services;
  return useMutation<StopMigrationResponse<T>, Error, StopArgs>({
    mutationKey: ['siemMigration', migrationType, 'stop'],
    mutationFn: async ({ migrationId }) => {
      if (migrationType === 'rule') {
        return siemMigrations.rules.stopRuleMigration(migrationId);
      }
      return siemMigrations.dashboards.stopDashboardMigration(migrationId);
    },
    onSuccess: (result) => {
      if (result.stopped) {
        notifications.toasts.addSuccess(STOP_SUCCESS);
      }
      onSuccess?.();
    },
    onError: (e: Error) => {
      notifications.toasts.addError(e, { title: STOP_ERROR });
    },
  });
}
