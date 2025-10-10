/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import type { DashboardMigrationStats } from '../../../../../../types';
import * as i18n from './translations';
import { DashboardsFileUpload } from './dashboards_file_upload';
import type { SplunkDashboardsResult, OnMigrationCreated } from '../../../../types';
import {
  useCreateMigration,
  type OnSuccess,
} from '../../../../../../service/hooks/use_create_migration';

export interface DashboardsFileUploadStepProps {
  status: EuiStepStatus;
  migrationStats: DashboardMigrationStats | undefined;
  migrationName: string | undefined;
  onDashboardsFileChanged?: (files: FileList | null) => void;
  onFileUpload?: (dashboards: SplunkDashboardsResult[]) => void;
  onMigrationCreated: OnMigrationCreated;
}
export const useDashboardsFileUploadStep = ({
  status,
  migrationStats,
  migrationName,
  onDashboardsFileChanged,
  onFileUpload,
  onMigrationCreated,
}: DashboardsFileUploadStepProps): EuiStepProps => {
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
      <DashboardsFileUpload
        createMigration={createMigration}
        migrationName={migrationName}
        isLoading={isLoading}
        isCreated={isCreated}
        apiError={error?.message}
        onDashboardsFileChanged={onDashboardsFileChanged}
        onFileUpload={onFileUpload}
        onMigrationCreated={onMigrationCreated}
      />
    ),
  };
};
