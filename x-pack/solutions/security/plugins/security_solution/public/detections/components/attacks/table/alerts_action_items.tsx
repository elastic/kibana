/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGroupTakeActionsItems } from '../../../hooks/alerts_table/use_group_take_action_items';
import type { GroupTakeActionItems } from '../../alerts_table/types';

export function AlertActionItems(props: Parameters<GroupTakeActionItems>[0]) {
  const getActionItems = useGroupTakeActionsItems({});

  return getActionItems(props);
}
