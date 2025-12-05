/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiButton } from '@elastic/eui';

import { WithMissingPrivileges } from '../missing_privileges';
import * as i18n from './translations';

interface CreateButtonProps {
  onClick?: () => void;
}

export const CreateButton: React.FC<CreateButtonProps> = React.memo(({ onClick }) => {
  const createNewScheduleButton = useCallback(
    (enabled: boolean) => {
      return (
        <EuiButton
          data-test-subj="createSchedule"
          fill
          onClick={onClick}
          size="m"
          iconType="plusInCircle"
          disabled={!enabled}
        >
          {i18n.CREATE_SCHEDULE}
        </EuiButton>
      );
    },
    [onClick]
  );

  return <WithMissingPrivileges>{createNewScheduleButton}</WithMissingPrivileges>;
});
CreateButton.displayName = 'CreateButton';
