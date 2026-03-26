/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo } from 'react';
import type { Status } from '../../../../../common/api/detection_engine';
import { useGroupTakeActionsItems } from '../../../hooks/alerts_table/use_group_take_action_items';
import type { GroupTakeActionItems } from '../../alerts_table/types';
import { useUserData } from '../../user_info';

type GroupTakeActionItemsProps = Parameters<GroupTakeActionItems>[0];
interface AlertActionItemsProps extends GroupTakeActionItemsProps {
  statusFilter: Status[];
}

export const AlertActionItems = memo(({ statusFilter, ...props }: AlertActionItemsProps) => {
  const [{ hasIndexWrite, hasIndexMaintenance }] = useUserData();
  const getActionItems = useGroupTakeActionsItems({
    currentStatus: statusFilter,
    showAlertStatusActions: Boolean(hasIndexWrite) && Boolean(hasIndexMaintenance),
  });

  return getActionItems(props);
});

AlertActionItems.displayName = 'AlertActionItems';
