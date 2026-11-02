/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation } from '@kbn/react-query';
import type { InstallMigrationDashboardsResponse } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_INSTALL_PATH } from '../../../../common/siem_migrations/dashboards/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { installMigrationDashboards } from '../api';
import { useInvalidateGetMigrationDashboards } from './use_get_migration_dashboards';
import type { DashboardMigrationStats } from '../types';

export const INSTALL_MIGRATION_DASHBOARDS_MUTATION_KEY = [
  'POST',
  SIEM_DASHBOARD_MIGRATION_INSTALL_PATH,
];

interface InstallMigrationDashboardsParams {
  ids?: string[];
}

export const useInstallMigrationDashboards = (migrationStats: DashboardMigrationStats) => {
  const { addError, addSuccess } = useAppToasts();
  const { telemetry } = useKibana().services.siemMigrations.dashboards;
  const { id: migrationId, vendor } = migrationStats;

  const reportTelemetry = useCallback(
    ({ ids }: InstallMigrationDashboardsParams, error?: Error) => {
      telemetry.reportTranslatedItemBulkInstall({
        migrationId,
        vendor,
        enabled: true,
        count: ids?.length ?? 0,
        error,
      });
    },
    [telemetry, migrationId, vendor]
  );

  const invalidateGetMigrationDashboards = useInvalidateGetMigrationDashboards();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<InstallMigrationDashboardsResponse, Error, InstallMigrationDashboardsParams>(
    ({ ids }) => installMigrationDashboards({ migrationId, ids }),
    {
      mutationKey: INSTALL_MIGRATION_DASHBOARDS_MUTATION_KEY,
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
