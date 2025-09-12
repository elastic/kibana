/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { UpdateDashboardMigrationRequestBody } from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { updateDashboardMigration } from '../api';
import * as i18n from '../service/translations';

/**
 * Hook to update a dashboard migration (e.g. rename) and show user feedback toasts.
 */
export const useUpdateDashboardMigration = (migrationId: string) => {
  const { addError, addSuccess } = useAppToasts();
  return useMutation({
    mutationFn: (body: UpdateDashboardMigrationRequestBody) =>
      updateDashboardMigration({ migrationId, body }),
    onError: (error: Error) => {
      addError(error, { title: i18n.UPDATE_DASHBOARD_MIGRATION_FAILURE });
    },
    onSuccess: () => {
      addSuccess(i18n.UPDATE_DASHBOARD_MIGRATION_SUCCESS);
    },
  });
};
