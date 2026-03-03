/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { type AddUploadedLookups } from '../../../../../../../common/components/migration_steps/types';
import { LookupsFileUpload } from '../../../../../../../common/components';
import type { SiemMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/common.gen';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type { RuleMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import { MigrationSource } from '../../../../../../../common/types';

export interface RulesFileUploadStepProps {
  status: EuiStepStatus;
  migrationStats: RuleMigrationTaskStats;
  missingLookups: string[];
  addUploadedLookups: AddUploadedLookups;
}
export const useLookupsFileUploadStep = ({
  status,
  migrationStats,
  addUploadedLookups,
}: RulesFileUploadStepProps): EuiStepProps => {
  const { upsertResources, isLoading, error } = useUpsertResources(addUploadedLookups);

  const upsertMigrationResources = useCallback(
    (lookupsFromFile: SiemMigrationResourceData[]) => {
      if (lookupsFromFile.length === 0) {
        return; // No lookups provided
      }
      upsertResources({
        migrationId: migrationStats.id,
        vendor: migrationStats.vendor,
        data: lookupsFromFile,
      });
    },
    [upsertResources, migrationStats]
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
    title: i18n.LOOKUPS_DATA_INPUT_FILE_UPLOAD_TITLE,
    status: uploadStepStatus,
    children: (
      <LookupsFileUpload
        createResources={upsertMigrationResources}
        isLoading={isLoading}
        apiError={error?.message}
        migrationSource={MigrationSource.SPLUNK}
      />
    ),
  };
};
