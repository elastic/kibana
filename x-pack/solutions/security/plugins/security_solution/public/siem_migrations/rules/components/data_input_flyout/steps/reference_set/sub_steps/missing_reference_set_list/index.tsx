/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import {
  type AddUploadedLookups,
  type UploadedLookups,
} from '../../../../../../../common/components/migration_steps/types';
import { MissingLookupsList } from '../../../../../../../common/components';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type { RuleMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import { MigrationSource } from '../../../../../../../common/types';

export interface MissingReferenceSetsListStepProps {
  status: EuiStepStatus;
  migrationStats: RuleMigrationTaskStats;
  missingLookups: string[];
  uploadedLookups: UploadedLookups;
  addUploadedLookups: AddUploadedLookups;
  onCopied: () => void;
}
export const useMissingReferenceSetsListStep = ({
  status,
  migrationStats,
  missingLookups,
  uploadedLookups,
  addUploadedLookups,
  onCopied,
}: MissingReferenceSetsListStepProps): EuiStepProps => {
  const { upsertResources, isLoading, error } = useUpsertResources(addUploadedLookups);

  const omitLookup = useCallback(
    (lookupName: string) => {
      // Saving the lookup with an empty content to omit it.
      // The translation will ignore this lookup and will not cause partial translations.
      upsertResources({
        migrationId: migrationStats.id,
        vendor: migrationStats.vendor,
        data: [{ type: 'lookup', name: lookupName, content: '' }],
      });
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
    title: i18n.REFERENCE_SET_DATA_INPUT_COPY_TITLE,
    status: listStepStatus,
    children: (
      <MissingLookupsList
        onCopied={onCopied}
        missingLookups={missingLookups}
        migrationSource={MigrationSource.QRADAR}
        uploadedLookups={uploadedLookups}
        omitLookup={omitLookup}
      />
    ),
  };
};
