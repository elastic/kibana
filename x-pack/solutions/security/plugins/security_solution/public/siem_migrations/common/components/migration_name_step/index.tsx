/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { useGetCurrentUserProfile } from '../../../../common/components/user_profiles/use_get_current_user_profile';
import { MigrationNameInput } from './migration_name_input';
import * as i18n from './translations';
import { getDefaultMigrationName } from '../../utils/get_default_migration_name';

export interface MigrationNameStepProps {
  status: EuiStepStatus;
  setMigrationName: (migrationName: string) => void;
  migrationName?: string;
}
export const useMigrationNameStep = ({
  status,
  setMigrationName,
  migrationName: storedMigrationName,
}: MigrationNameStepProps): EuiStepProps => {
  const { data: currentUserProfile, isLoading } = useGetCurrentUserProfile();

  const migrationName = useMemo(() => {
    if (storedMigrationName) {
      return storedMigrationName;
    }
    return getDefaultMigrationName(currentUserProfile?.user.username);
  }, [storedMigrationName, currentUserProfile?.user.username]);

  return {
    title: i18n.MIGRATION_NAME_INPUT_TITLE,
    status,
    children: isLoading ? (
      <CenteredLoadingSpinner />
    ) : (
      <MigrationNameInput migrationName={migrationName} setMigrationName={setMigrationName} />
    ),
  };
};
