/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Generic start migration hook for both rule and dashboard migrations using React Query.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { StartRuleMigrationResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { RuleMigrationSettings } from '../../rules/types';
import type { StartDashboardsMigrationResponse } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';

export interface DashboardStartSettings {
  connectorId: string;
}
export type RuleStartSettings = RuleMigrationSettings;
export type StartSettings<T extends MigrationType> = T extends 'rule'
  ? RuleStartSettings
  : DashboardStartSettings;

export type StartMigrationResponse<T extends MigrationType> = T extends 'rule'
  ? StartRuleMigrationResponse
  : StartDashboardsMigrationResponse;

export const START_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.service.startMigrationSuccess',
  { defaultMessage: 'Migration started successfully.' }
);
export const START_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.service.startMigrationError',
  { defaultMessage: 'Error starting migration.' }
);

interface StartArgs<T extends MigrationType> {
  migrationId: string;
  retry?: SiemMigrationRetryFilter;
  settings?: StartSettings<T>;
}

interface UseStartOptions {
  onSuccess?: () => void;
}

export function useStartSiemMigration<T extends MigrationType>(
  migrationType: T,
  { onSuccess }: UseStartOptions = {}
) {
  const { siemMigrations } = useKibana().services;
  const { addSuccess, addError } = useAppToasts();

  return useMutation<StartMigrationResponse<T>, Error, StartArgs<T>>({
    mutationKey: ['siemMigration', migrationType, 'start'],
    mutationFn: async ({ migrationId, retry, settings }) => {
      if (migrationType === 'rule') {
        return siemMigrations.rules.startRuleMigration(
          migrationId,
          retry,
          settings as RuleStartSettings | undefined
        );
      }
      return siemMigrations.dashboards.startDashboardMigration(
        migrationId,
        retry,
        settings as DashboardStartSettings | undefined
      );
    },
    onSuccess: (result) => {
      if (result.started) {
        addSuccess(START_SUCCESS);
      }
      onSuccess?.();
    },
    onError: (e: Error) => {
      addError(e, { title: START_ERROR });
    },
  });
}
