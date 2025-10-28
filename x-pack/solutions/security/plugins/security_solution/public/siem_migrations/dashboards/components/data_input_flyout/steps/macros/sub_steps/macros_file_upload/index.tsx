/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { useAppToasts } from '../../../../../../../../common/hooks/use_app_toasts';
import type { SiemMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/common.gen';
import { DashboardResourceIdentifier } from '../../../../../../../../../common/siem_migrations/dashboards/resources';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type { DashboardMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { OnResourcesCreated } from '../../../../types';
import { MacrosFileUpload } from './macros_file_upload';
import * as i18n from './translations';

export interface DashboardsFileUploadStepProps {
  status: EuiStepStatus;
  migrationStats: DashboardMigrationTaskStats;
  missingMacros: string[];
  onMacrosCreated: OnResourcesCreated;
}
export const useMacrosFileUploadStep = ({
  status,
  migrationStats,
  missingMacros,
  onMacrosCreated,
}: DashboardsFileUploadStepProps): EuiStepProps => {
  const { addWarning } = useAppToasts();
  const { upsertResources, isLoading, error } = useUpsertResources(onMacrosCreated);

  const upsertMigrationResources = useCallback(
    (macrosFromFile: SiemMigrationResourceData[]) => {
      const macrosIndexed: Record<string, SiemMigrationResourceData> = Object.fromEntries(
        macrosFromFile.map((macro) => [macro.name, macro])
      );
      const resourceIdentifier = new DashboardResourceIdentifier('splunk');
      const macrosToUpsert: SiemMigrationResourceData[] = [];
      let missingMacrosIt: string[] = missingMacros;

      while (missingMacrosIt.length > 0) {
        const macros: SiemMigrationResourceData[] = [];
        missingMacrosIt.forEach((macroName) => {
          const macro = macrosIndexed[macroName];
          if (macro) {
            macros.push(macro);
          } else {
            // Macro missing from file
          }
        });
        macrosToUpsert.push(...macros);

        missingMacrosIt = resourceIdentifier
          .fromResources(macros)
          .reduce<string[]>((acc, resource) => {
            if (resource.type === 'macro') {
              acc.push(resource.name);
            }
            return acc;
          }, []);
      }

      if (macrosToUpsert.length === 0) {
        addWarning({ title: i18n.NO_MISSING_MACROS_PROVIDED });
        return; // No missing macros provided
      }
      upsertResources(migrationStats.id, macrosToUpsert);
    },
    [missingMacros, upsertResources, migrationStats.id, addWarning]
  );

  const uploadStepStatus = useMemo(() => {
    if (isLoading) {
      return 'loading';
    }
    if (error) {
      return 'danger';
    }
    return status;
  }, [isLoading, error, status]);

  return {
    title: i18n.MACROS_DATA_INPUT_FILE_UPLOAD_TITLE,
    status: uploadStepStatus,
    children: (
      <MacrosFileUpload
        createResources={upsertMigrationResources}
        isLoading={isLoading}
        apiError={error?.message}
      />
    ),
  };
};
