/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { MigrationNameInput } from './migration_name_input';
import * as i18n from './translations';
import { useGetCurrentUserProfile } from '../../../../common/components/user_profiles/use_get_current_user_profile';

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
    if (isLoading) {
      return undefined; // profile is still loading
    }

    // localized date and time according to the locale including seconds
    const datetime = moment(Date.now()).format('ddd , ll, LTS');

    const userName = currentUserProfile?.user.full_name || currentUserProfile?.user.username;

    if (userName) {
      return `${userName}'s migration on ${datetime}`;
    }

    return `Migration created on ${datetime}`;
  }, [
    storedMigrationName,
    currentUserProfile?.user.username,
    currentUserProfile?.user.full_name,
    isLoading,
  ]);

  return {
    title: i18n.MIGRATION_NAME_INPUT_TITLE,
    status,
    children: migrationName ? (
      <MigrationNameInput migrationName={migrationName} setMigrationName={setMigrationName} />
    ) : null,
  };
};
