/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import * as i18n from './translations';
import { DashboardsFileUpload } from './dashboards_file_upload';
import type { SplunkDashboardsResult } from '../../../../types';

export interface DashboardsFileUploadStepProps {
  status: EuiStepStatus;
  // migrationStats: DashboardMigrationTaskStats | undefined;
  migrationName: string | undefined;
  // onMigrationCreated: OnMigrationCreated;
  onDashboardsFileChanged?: (files: FileList | null) => void;
  onFileUpload: (dashboards: SplunkDashboardsResult[]) => void;
}
export const useDashboardsFileUploadStep = ({
  status,
  // migrationStats,
  migrationName,
  // onMigrationCreated,
  onDashboardsFileChanged,
  onFileUpload,
}: DashboardsFileUploadStepProps): EuiStepProps => {
  return {
    title: i18n.DASHBOARDS_DATA_INPUT_FILE_UPLOAD_TITLE,
    status,
    children: (
      <DashboardsFileUpload
        migrationName={migrationName}
        isLoading={false}
        isCreated={false}
        apiError={undefined}
        onDashboardsFileChanged={onDashboardsFileChanged}
        onFileUpload={onFileUpload}
      />
    ),
  };
};
