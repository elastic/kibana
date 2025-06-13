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
import { useGetCurrentUserProfile } from '../../../../../../../../common/components/user_profiles/use_get_current_user_profile';

export interface MigrationNameStepProps {
  status: EuiStepStatus;
  migrationName: string;
  setMigrationName: (migrationName: string) => void;
  subStep: number;
}
export const useMigrationNameStep = ({
  status,
  migrationName,
  setMigrationName,
  subStep,
}: MigrationNameStepProps): EuiStepProps => {
  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const currentUserName = useMemo(() => {
    return currentUserProfile?.user.username;
  }, [currentUserProfile?.user.username]);
  const defaultMigrationName = useMemo(() => {
    return `${currentUserName}'s migration ${moment(Date.now()).format('MMMM Do YYYY, h:mm:ss a')}`;
  }, [currentUserName]);

  return {
    title: i18n.MIGRATION_NAME_INPUT_TITLE,
    status,
    children:
      currentUserName != null ? (
        <MigrationNameInput
          defaultMigrationName={defaultMigrationName}
          migrationName={migrationName}
          setMigrationName={setMigrationName}
          subStep={subStep}
        />
      ) : null,
  };
};
