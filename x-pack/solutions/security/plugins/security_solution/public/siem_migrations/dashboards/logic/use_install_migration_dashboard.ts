/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useCallback } from 'react';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { SIEM_DASHBOARD_MIGRATION_INSTALL_PATH } from '../../../../common/siem_migrations/dashboards/constants';
import type { InstallMigrationDashboardsResponse } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateGetMigrationDashboards } from './use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { installMigrationDashboards } from '../api';

export const INSTALL_MIGRATION_DASHBOARD_MUTATION_KEY = [
  'POST',
  SIEM_DASHBOARD_MIGRATION_INSTALL_PATH,
];

interface InstallMigrationDashboardParams {
  migrationDashboard: DashboardMigrationDashboard;
}

export const useInstallMigrationDashboard = (migrationId: string) => {
  const { addError, addSuccess } = useAppToasts();
  const { telemetry } = useKibana().services.siemMigrations.dashboards;

  const reportTelemetry = useCallback(
    ({ migrationDashboard }: InstallMigrationDashboardParams, error?: Error) => {
      telemetry.reportTranslatedItemInstall({
        migrationItem: migrationDashboard,
        enabled: true,
        error,
      });
    },
    [telemetry]
  );

  const invalidateGetMigrationDashboards = useInvalidateGetMigrationDashboards();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<InstallMigrationDashboardsResponse, Error, InstallMigrationDashboardParams>(
    ({ migrationDashboard }) =>
      installMigrationDashboards({ migrationId, ids: [migrationDashboard.id] }),
    {
      mutationKey: INSTALL_MIGRATION_DASHBOARD_MUTATION_KEY,
      onSuccess: ({ installed }, variables) => {
        addSuccess(i18n.INSTALL_MIGRATION_DASHBOARDS_SUCCESS(installed));
        reportTelemetry(variables);
      },
      onError: (error, variables) => {
        addError(error, { title: i18n.INSTALL_MIGRATION_DASHBOARDS_FAILURE });
        reportTelemetry(variables, error);
      },
      onSettled: () => {
        invalidateGetMigrationDashboards(migrationId);
        invalidateGetMigrationTranslationStats(migrationId);
      },
    }
  );
};
