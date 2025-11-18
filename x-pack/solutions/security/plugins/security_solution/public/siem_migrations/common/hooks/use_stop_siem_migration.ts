/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

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

export function useStopSiemMigration<T extends MigrationType>(
  migrationType: T,
  { onSuccess }: UseStopOptions = {}
) {
  const { siemMigrations } = useKibana().services;
  const { addSuccess, addError } = useAppToasts();
  const stopMigration = useCallback(
    (migrationId: string) => {
      if (migrationType === 'rule') {
        return siemMigrations.rules.stopRuleMigration(migrationId);
      } else {
        return siemMigrations.dashboards.stopDashboardMigration(migrationId);
      }
    },
    [siemMigrations, migrationType]
  );

  return useMutation({
    mutationKey: ['siemMigration', migrationType, 'stop'],
    mutationFn: async ({ migrationId }: StopArgs) => {
      return stopMigration(migrationId);
    },
    onSuccess: (result) => {
      if (result.stopped) {
        addSuccess(STOP_SUCCESS);
      }
      onSuccess?.();
    },
    onError: (e: Error) => {
      addError(e, { title: STOP_ERROR });
    },
  });
}
