/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import type { DashboardMigrationStats } from '../../../../../../types';
import { SentinelWorkbookFileUpload } from './sentinel_workbook_file_upload';
import {
  useCreateMigration,
  type OnSuccess,
} from '../../../../../../service/hooks/use_create_migration';
import * as i18n from '../dashboards_file_upload/translations';
import type { OnMigrationCreated } from '../../../../types';

export interface SentinelWorkbookFileUploadStepProps {
  status: EuiStepStatus;
  migrationStats: DashboardMigrationStats | undefined;
  migrationName: string | undefined;
  onWorkbookFileChanged: (files: FileList | null) => void;
  onMigrationCreated: OnMigrationCreated;
}

export const useSentinelWorkbookFileUploadStep = ({
  status,
  migrationStats,
  migrationName,
  onWorkbookFileChanged,
  onMigrationCreated,
}: SentinelWorkbookFileUploadStepProps): EuiStepProps => {
  const [isCreated, setIsCreated] = useState<boolean>(!!migrationStats);
  const onSuccess = useCallback<OnSuccess>(
    (stats) => {
      setIsCreated(true);
      onMigrationCreated(stats);
    },
    [onMigrationCreated]
  );
  const { createMigration, isLoading, error } = useCreateMigration(onSuccess);

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
    title: i18n.DASHBOARDS_DATA_INPUT_FILE_UPLOAD_TITLE,
    status: uploadStepStatus,
    children: (
      <SentinelWorkbookFileUpload
        createMigration={createMigration}
        migrationName={migrationName}
        isLoading={isLoading}
        isCreated={isCreated}
        apiError={error?.message}
        onWorkbookFileChanged={onWorkbookFileChanged}
      />
    ),
  };
};
