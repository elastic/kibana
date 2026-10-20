/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { MissingPrivilegesTooltip } from '../../../../../common/components/missing_privileges';
import { useHasWorkflowsPrivileges } from '../../../hooks/use_has_workflows_privileges';
import { useCanUpdateSchedule } from '../../hooks/use_can_update_schedule';
import * as i18n from './translations';

interface WithMissingPrivilegesProps {
  children: (enabled: boolean) => React.ReactElement;
  /**
   * When `true`, the child control additionally requires the Workflows Management
   * `execute` privilege (used by create / update / enable, which trigger workflow
   * runs). Defaults to `false`, preserving the update-schedule-only check used by
   * disable / delete.
   */
  requireWorkflowsExecute?: boolean;
}

export const WithMissingPrivileges: React.FC<WithMissingPrivilegesProps> = React.memo(
  ({ children, requireWorkflowsExecute = false }) => {
    const canUpdateSchedule = useCanUpdateSchedule();
    const { hasWorkflowsExecute } = useHasWorkflowsPrivileges();

    const hasRequiredWorkflowsPrivilege = !requireWorkflowsExecute || hasWorkflowsExecute;
    const enabled = canUpdateSchedule && hasRequiredWorkflowsPrivilege;

    const subComponent = useMemo(() => {
      return children(enabled);
    }, [children, enabled]);

    const description = useMemo(
      () =>
        canUpdateSchedule
          ? i18n.MISSING_WORKFLOWS_EXECUTE_PRIVILEGES_DESCRIPTION
          : i18n.MISSING_UPDATE_SCHEDULE_PRIVILEGES_DESCRIPTION,
      [canUpdateSchedule]
    );

    return (
      <>
        {enabled ? (
          subComponent
        ) : (
          <MissingPrivilegesTooltip description={description}>
            {subComponent}
          </MissingPrivilegesTooltip>
        )}
      </>
    );
  }
);
WithMissingPrivileges.displayName = 'WithMissingPrivileges';
