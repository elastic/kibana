/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
import { EuiHorizontalRule, EuiListGroup } from '@elastic/eui';
import { PopoverListItem } from './popover_list_item';
import { GraphPopover } from './graph_popover';

/**
 * Props for the ListGroupGraphPopover component.
 */
interface ListGroupGraphPopoverProps {
  /**
   * The data-test-subj value for the popover.
   */
  testSubject: string;

  /**
   * Indicates whether the popover is open.
   */
  isOpen: boolean;

  /**
   * The HTML element that the popover is anchored to.
   */
  anchorElement: HTMLElement | null;

  /**
   * Function to close the popover.
   */
  closePopover: () => void;

  /**
   * The action to take when the related entities toggle is clicked.
   */
  items?: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>;

  /**
   * Function to get the list of items to display in the popover.
   * When provided, this function is called each time the popover is opened.
   * If `items` is provided, this function is ignored.
   */
  itemsFn?: () => Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>;
}

export interface ItemExpandPopoverListItemProps {
  type: 'item';
  iconType: string;
  label: string;
  onClick: () => void;
  testSubject: string;
  disabled?: boolean;
  showToolTip?: boolean;
  toolTipText?: string;
  toolTipProps?: Partial<EuiToolTipProps>;
}

export interface SeparatorExpandPopoverListItemProps {
  type: 'separator';
}

/**
 * A graph popover that displays a list of items.
 */
export const ListGraphPopover = memo<ListGroupGraphPopoverProps>(
  ({ isOpen, anchorElement, closePopover, items, itemsFn, testSubject }) => {
    const listItems = items || itemsFn?.() || [];

    return (
      <GraphPopover
        panelPaddingSize="none"
        anchorPosition="rightCenter"
        isOpen={isOpen}
        anchorElement={anchorElement}
        closePopover={closePopover}
        data-test-subj={testSubject}
      >
        <EuiListGroup gutterSize="none" bordered={false} flush={true} size="l">
          {listItems.map((item, index) => {
            if (item.type === 'separator') {
              return <EuiHorizontalRule key={index} margin="none" size="full" />;
            }
            return (
              <PopoverListItem
                key={index}
                iconType={item.iconType}
                label={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                data-test-subj={item.testSubject}
                showToolTip={item.showToolTip}
                toolTipText={item.toolTipText}
                toolTipProps={item.toolTipProps}
              />
            );
          })}
        </EuiListGroup>
      </GraphPopover>
    );
  }
);

ListGraphPopover.displayName = 'ListGraphPopover';
