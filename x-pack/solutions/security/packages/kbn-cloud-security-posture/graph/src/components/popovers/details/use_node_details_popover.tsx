/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo, useCallback } from 'react';
import { EuiListGroup, useEuiTheme } from '@elastic/eui';
import styled from '@emotion/styled';
import type { PopoverActions, PopoverState } from '../primitives/use_graph_popover_state';
import { useGraphPopoverState } from '../primitives/use_graph_popover_state';
import { GraphPopover } from '../primitives/graph_popover';
import { PopoverListItem } from '../primitives/popover_list_item';

export interface UseNodeDetailsPopoverReturn {
  /**
   * The ID of the popover.
   */
  id: string;

  /**
   * Handler to open the popover when the button is clicked.
   */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * The component that renders the popover.
   */
  PopoverComponent: React.FC;

  /**
   * The popover actions and state.
   */
  actions: PopoverActions;

  /**
   * The popover state.
   */
  state: PopoverState;
}

export interface GenericPopoverItem {
  label: string | ReactNode;
  key: string;
}

export interface UseGenericPopoverProps {
  /**
   * Unique ID for the popover instance
   */
  popoverId: string;

  /**
   * Array of items to display in the popover
   */
  items: GenericPopoverItem[];

  /**
   * Content test subject ID for the popover content
   */
  contentTestSubj: string;

  /**
   * Item test subject ID for individual items
   */
  itemTestSubj: string;

  /**
   * Popover test subject ID
   */
  popoverTestSubj: string;
}

const MAX_VISIBLE_ITEMS = 10;

const StyledPopoverListItem = styled(PopoverListItem)`
  > span {
    min-block-size: unset !important;
    padding-block: unset !important;
  }
`;

export const useNodeDetailsPopover = ({
  popoverId,
  items,
  contentTestSubj,
  itemTestSubj,
  popoverTestSubj,
}: UseGenericPopoverProps): UseNodeDetailsPopoverReturn => {
  const { id, state, actions } = useGraphPopoverState(popoverId);
  const { euiTheme } = useEuiTheme();

  // Calculate dynamic height based on number of items
  const panelStyle = useMemo(() => {
    const shouldScroll = items.length > MAX_VISIBLE_ITEMS;
    const maxHeight = shouldScroll
      ? `${MAX_VISIBLE_ITEMS * parseInt(euiTheme.size.l, 10) + parseInt(euiTheme.size.xl, 10)}px`
      : 'auto';

    return {
      maxHeight,
      overflowY: shouldScroll ? ('auto' as const) : ('visible' as const),
    };
  }, [items.length, euiTheme]);

  const popoverContent = useMemo(
    () => (
      <EuiListGroup
        gutterSize="none"
        bordered={false}
        size="m"
        flush={true}
        data-test-subj={contentTestSubj}
      >
        {items.map((item) => (
          <StyledPopoverListItem
            key={item.key}
            label={item.label}
            data-test-subj={itemTestSubj}
            showToolTip={false}
          />
        ))}
      </EuiListGroup>
    ),
    [items, contentTestSubj, itemTestSubj]
  );

  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <GraphPopover
      panelPaddingSize="m"
      anchorPosition="rightCenter"
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={actions.closePopover}
      panelStyle={panelStyle}
      data-test-subj={popoverTestSubj}
    >
      {popoverContent}
    </GraphPopover>
  ));

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => actions.openPopover(e.currentTarget),
    [actions]
  );

  return useMemo(
    () => ({
      id,
      onClick,
      PopoverComponent,
      actions,
      state,
    }),
    [PopoverComponent, actions, id, state, onClick]
  );
};
