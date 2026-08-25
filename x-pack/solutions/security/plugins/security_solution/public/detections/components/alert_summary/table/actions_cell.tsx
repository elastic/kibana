/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { GetTableProp } from './types';
import { MoreActionsRowControlColumn } from './more_actions_row_control_column';
import { OpenFlyoutRowControlColumn } from './open_flyout_row_control_column';

export type ActionsCellProps = Pick<ComponentProps<GetTableProp<'renderActionsCell'>>, 'alert'>;

/**
 * Component used in EASE alert summary table.
 * It is passed to the renderActionsCell property of the EuiDataGrid.
 * It renders all the icons in the row action icons:
 * - open flyout
 * - assistant
 * - more actions
 */
export const ActionsCell = memo(({ alert }: ActionsCellProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs">
    <EuiFlexItem>
      <OpenFlyoutRowControlColumn alert={alert} />
    </EuiFlexItem>
    <EuiFlexItem>
      <MoreActionsRowControlColumn alert={alert} />
    </EuiFlexItem>
  </EuiFlexGroup>
));

ActionsCell.displayName = 'ActionsCell';
