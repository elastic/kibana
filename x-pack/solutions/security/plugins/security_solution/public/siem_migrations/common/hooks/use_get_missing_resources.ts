/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { SiemMigrationResourceBase } from '../../../../common/siem_migrations/model/common.gen';

export const GET_MISSING_RESOURCES_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.getMissingResourcesError',
  { defaultMessage: 'Failed to fetch missing macros & lookups' }
);

export type OnSuccess = (missingResources: SiemMigrationResourceBase[]) => void;

export const useGetMissingResources = (migrationType: MigrationType, onSuccess?: OnSuccess) => {
  const { siemMigrations } = useKibana().services;
  const { addError } = useAppToasts();

  return useMutation<SiemMigrationResourceBase[], Error, string>({
    mutationKey: ['siemMigration', migrationType, 'getMissingResources'],
    mutationFn: async (migrationId: string) => {
      if (migrationType === 'rule') {
        return siemMigrations.rules.api.getMissingResources({ migrationId });
      }
      return siemMigrations.dashboards.api.getDashboardMigrationMissingResources({
        migrationId,
      });
    },
    onSuccess: (missingResources) => {
      onSuccess?.(missingResources);
    },
    onError: (err) => {
      const apiError = err.message ?? err;
      addError(apiError, {
        title: GET_MISSING_RESOURCES_ERROR,
      });
    },
  });
};
