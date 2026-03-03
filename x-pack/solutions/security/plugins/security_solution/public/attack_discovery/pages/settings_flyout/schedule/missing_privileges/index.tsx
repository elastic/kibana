/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { MissingPrivilegesTooltip } from '../../../../../common/components/missing_privileges';
import { useCanUpdateSchedule } from '../../hooks/use_can_update_schedule';
import * as i18n from './translations';

interface WithMissingPrivilegesProps {
  children: (enabled: boolean) => React.ReactElement;
}

export const WithMissingPrivileges: React.FC<WithMissingPrivilegesProps> = React.memo(
  ({ children }) => {
    const canUpdateSchedule = useCanUpdateSchedule();

    const subComponent = useMemo(() => {
      return children(canUpdateSchedule);
    }, [canUpdateSchedule, children]);

    return (
      <>
        {canUpdateSchedule ? (
          subComponent
        ) : (
          <MissingPrivilegesTooltip
            description={i18n.MISSING_UPDATE_SCHEDULE_PRIVILEGES_DESCRIPTION}
          >
            {subComponent}
          </MissingPrivilegesTooltip>
        )}
      </>
    );
  }
);
WithMissingPrivileges.displayName = 'WithMissingPrivileges';
