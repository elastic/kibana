/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useAlertTagsActions } from '../../alerts_table/timeline_actions/use_alert_tags_actions';
import { useAddToCaseActions } from '../../alerts_table/timeline_actions/use_add_to_case_actions';

export interface MoreActionsRowControlColumnProps {
  /**
   *
   */
  ecs: Ecs;
}

/**
 *
 */
export const MoreActionsRowControlColumn = memo(({ ecs }: MoreActionsRowControlColumnProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

  const button = useMemo(
    () => <EuiButtonIcon iconType="boxesHorizontal" onClick={togglePopover} />,
    [togglePopover]
  );

  const { addToCaseActionItems } = useAddToCaseActions({
    ecsData: ecs,
    onMenuItemClick: togglePopover,
    isActiveTimelines: false,
    ariaLabel: '',
    isInDetections: true,
  });

  const { alertTagsItems } = useAlertTagsActions({
    closePopover: togglePopover,
    ecsRowData: ecs,
  });

  const items = useMemo(
    () => [
      addToCaseActionItems.map((item) => (
        <EuiContextMenuItem key={item.key} onClick={item.onClick}>
          {item.name}
        </EuiContextMenuItem>
      )),
      alertTagsItems.map((item) => (
        <EuiContextMenuItem key={item.key} onClick={item.onClick}>
          {item.name}
        </EuiContextMenuItem>
      )),
    ],
    [addToCaseActionItems, alertTagsItems]
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
});

MoreActionsRowControlColumn.displayName = 'MoreActionsRowControlColumn';
