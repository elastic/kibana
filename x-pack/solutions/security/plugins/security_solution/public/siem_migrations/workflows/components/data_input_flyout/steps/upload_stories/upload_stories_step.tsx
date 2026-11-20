/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { useCreateMigration, type OnSuccess } from '../../../../service/hooks/use_create_migration';
import { TinesStoriesFileUpload } from '../../tines_stories_file_upload';
import * as i18n from '../../translations';

export interface TinesStoriesUploadStepProps {
  status: EuiStepStatus;
  migrationName: string | undefined;
  onMigrationCreated: OnSuccess;
}

export const useTinesStoriesUploadStep = ({
  status,
  migrationName,
  onMigrationCreated,
}: TinesStoriesUploadStepProps): EuiStepProps => {
  const [isCreated, setIsCreated] = useState<boolean>(false);
  const onSuccess = useCallback<OnSuccess>(
    (migrationId) => {
      setIsCreated(true);
      onMigrationCreated(migrationId);
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
    title: i18n.DATA_INPUT_FLYOUT_UPLOAD_TITLE,
    status: uploadStepStatus,
    children: (
      <TinesStoriesFileUpload
        createMigration={createMigration}
        migrationName={migrationName}
        isLoading={isLoading}
        isCreated={isCreated}
        apiError={error?.message}
      />
    ),
  };
};
