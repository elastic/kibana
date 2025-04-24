/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { MoreActionsRowControlColumn } from './more_actions_row_control_column';
import { OpenFlyoutRowControlColumn } from './open_flyout_row_control_column';

export interface ActionsCellProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
  /**
   * The Ycs type is @deprecated but needed for the case actions within the more action dropdown
   */
  ecsAlert: Ecs;
}

/**
 * Component used in the AI for SOC alert summary table.
 * It is passed to the renderActionsCell property of the EuiDataGrid.
 * It renders all the icons in the row action icons:
 * - open flyout
 * - assistant
 * - more actions
 */
export const ActionsCell = memo(({ alert, ecsAlert }: ActionsCellProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs">
    <EuiFlexItem>
      <OpenFlyoutRowControlColumn alert={alert} />
    </EuiFlexItem>
    <EuiFlexItem>
      <MoreActionsRowControlColumn ecsAlert={ecsAlert} />
    </EuiFlexItem>
  </EuiFlexGroup>
));

ActionsCell.displayName = 'ActionsCell';
