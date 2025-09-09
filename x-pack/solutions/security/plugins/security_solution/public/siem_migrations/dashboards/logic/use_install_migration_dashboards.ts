/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { InstallMigrationDashboardsResponse } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_INSTALL_PATH } from '../../../../common/siem_migrations/dashboards/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
// import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { installMigrationDashboards } from '../api';
import { useInvalidateGetMigrationDashboards } from './use_get_migration_dashboards';

export const INSTALL_MIGRATION_DASHBOARDS_MUTATION_KEY = [
  'POST',
  SIEM_DASHBOARD_MIGRATION_INSTALL_PATH,
];

interface InstallMigrationDashboardsParams {
  ids?: string[];
}

export const useInstallMigrationDashboards = (migrationId: string) => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetMigrationDashboards = useInvalidateGetMigrationDashboards();
  // TODO: Uncomment this once translation stats are merged
  // const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();

  return useMutation<InstallMigrationDashboardsResponse, Error, InstallMigrationDashboardsParams>(
    ({ ids }) => installMigrationDashboards({ migrationId, ids }),
    {
      mutationKey: INSTALL_MIGRATION_DASHBOARDS_MUTATION_KEY,
      onSuccess: ({ installed }) => {
        addSuccess(i18n.INSTALL_MIGRATION_DASHBOARDS_SUCCESS(installed));
      },
      onError: (error) => {
        addError(error, { title: i18n.INSTALL_MIGRATION_DASHBOARDS_FAILURE });
      },
      onSettled: () => {
        invalidateGetMigrationDashboards(migrationId);
        // invalidateGetMigrationTranslationStats(migrationId);
      },
    }
  );
};
