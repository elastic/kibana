/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import type {
  AddUploadedLookups,
  UploadedLookups,
} from '../../../../../../../common/components/migration_steps/types';
import { MissingLookupsList } from '../../../../../../../common/components/migration_steps';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type { DashboardMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import * as i18n from './translations';

export interface MissingLookupsListStepProps {
  status: EuiStepStatus;
  migrationStats: DashboardMigrationTaskStats;
  missingLookups: string[];
  uploadedLookups: UploadedLookups;
  addUploadedLookups: AddUploadedLookups;
  onCopied: () => void;
}
export const useMissingLookupsListStep = ({
  status,
  migrationStats,
  missingLookups,
  uploadedLookups,
  addUploadedLookups,
  onCopied,
}: MissingLookupsListStepProps): EuiStepProps => {
  const { upsertResources, isLoading, error } = useUpsertResources(addUploadedLookups);

  const omitLookup = useCallback(
    (lookupName: string) => {
      // Saving the lookup with an empty content to omit it.
      // The translation will ignore this lookup and will not cause partial translations.
      upsertResources(migrationStats.id, [{ type: 'lookup', name: lookupName, content: '' }]);
    },
    [upsertResources, migrationStats]
  );

  const listStepStatus = useMemo(() => {
    if (isLoading) {
      return 'loading';
    }
    if (error) {
      return 'danger';
    }
    return status;
  }, [isLoading, error, status]);

  return {
    title: i18n.LOOKUPS_DATA_INPUT_COPY_TITLE,
    status: listStepStatus,
    children: (
      <MissingLookupsList
        onCopied={onCopied}
        missingLookups={missingLookups}
        uploadedLookups={uploadedLookups}
        omitLookup={omitLookup}
      />
    ),
  };
};
