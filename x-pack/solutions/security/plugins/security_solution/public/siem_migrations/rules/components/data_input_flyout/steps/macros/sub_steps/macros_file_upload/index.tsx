/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { ResourceIdentifier } from '../../../../../../../../../common/siem_migrations/rules/resources';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type {
  RuleMigrationResourceData,
  RuleMigrationTaskStats,
} from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
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
  const { upsertResources, isLoading, error } = useUpsertResources(onMacrosCreated);

  const upsertMigrationResources = useCallback(
    (macrosFromFile: RuleMigrationResourceData[]) => {
      const macrosIndexed: Record<string, RuleMigrationResourceData> = Object.fromEntries(
        macrosFromFile.map((macro) => [macro.name, macro])
      );
      const resourceIdentifier = new ResourceIdentifier('splunk');
      const macrosToUpsert: RuleMigrationResourceData[] = [];
      let missingMacrosIt: string[] = missingMacros;

      while (missingMacrosIt.length > 0) {
        const macros: RuleMigrationResourceData[] = [];
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
        return; // No missing macros provided
      }
      upsertResources(migrationStats.id, macrosToUpsert);
    },
    [upsertResources, migrationStats, missingMacros]
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
