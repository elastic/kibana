/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { ExperimentalFeaturesService } from '../../../../../../../../common/experimental_features_service';
import { useAppToasts } from '../../../../../../../../common/hooks/use_app_toasts';
import type { SiemMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/common.gen';
import { RuleResourceIdentifier } from '../../../../../../../../../common/siem_migrations/rules/resources';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type { RuleMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnResourcesCreated } from '../../../../types';
import { MacrosFileUpload } from './macros_file_upload';
import * as i18n from './translations';

export interface RulesFileUploadStepProps {
  status: EuiStepStatus;
  migrationStats: RuleMigrationTaskStats;
  missingMacros: string[];
  onMacrosCreated: OnResourcesCreated;
}
export const useMacrosFileUploadStep = ({
  status,
  migrationStats,
  missingMacros,
  onMacrosCreated,
}: RulesFileUploadStepProps): EuiStepProps => {
  const { addWarning } = useAppToasts();
  const { upsertResources, isLoading, error } = useUpsertResources(onMacrosCreated);

  const upsertMigrationResources = useCallback(
    async (macrosFromFile: SiemMigrationResourceData[]) => {
      const macrosIndexed: Record<string, SiemMigrationResourceData> = Object.fromEntries(
        macrosFromFile.map((macro) => [macro.name, macro])
      );
      const resourceIdentifier = new RuleResourceIdentifier('splunk', {
        experimentalFeatures: ExperimentalFeaturesService.get(),
      });
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

        const identifiedMissingMacros = await resourceIdentifier.fromResources(macros);
        missingMacrosIt = identifiedMissingMacros.reduce<string[]>((acc, resource) => {
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
      upsertResources({
        migrationId: migrationStats.id,
        vendor: migrationStats.vendor,
        data: macrosToUpsert,
      });
    },
    [missingMacros, upsertResources, migrationStats.id, migrationStats.vendor, addWarning]
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
