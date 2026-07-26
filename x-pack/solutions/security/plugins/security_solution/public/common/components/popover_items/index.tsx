/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiPopover,
  EuiBadgeGroup,
  EuiBadge,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';

export interface PopoverItemsProps<T> {
  renderItem: (item: T, index: number, items: T[]) => React.ReactNode;
  items: T[];
  popoverButtonTitle: string;
  popoverButtonIcon?: string;
  popoverTitle?: string;
  numberOfItemsToDisplay?: number;
  dataTestPrefix?: string;
}

const PopoverItemsWrapper = styled(EuiFlexGroup)`
  width: 100%;
`;

const PopoverWrapper = styled(EuiBadgeGroup)`
  max-height: 200px;
  max-width: 600px;
  overflow: auto;
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
`;

/**
 * Component to render list of items in popover, wicth configurabe number of display items by default
 * @param items - array of items to render
 * @param renderItem - render function that render item, arguments: item, index, items[]
 * @param popoverTitle - title of popover
 * @param popoverButtonTitle - title of popover button that triggers popover
 * @param popoverButtonIcon - icon of popover button that triggers popover
 * @param numberOfItemsToDisplay - number of items to render that are no in popover, defaults to 0
 * @param dataTestPrefix - data-test-subj prefix to apply to elements
 */
const PopoverItemsComponent = <T extends unknown>({
  items,
  renderItem,
  popoverTitle,
  popoverButtonTitle,
  popoverButtonIcon,
  numberOfItemsToDisplay = 0,
  dataTestPrefix = 'items',
}: PopoverItemsProps<T>) => {
  const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
  const { visibleItems, overflowItems, hasOverflowItems, shouldShowVisibleItems } = useMemo(() => {
    return {
      visibleItems: items.slice(0, numberOfItemsToDisplay),
      overflowItems: items.slice(numberOfItemsToDisplay),
      hasOverflowItems: items.length > numberOfItemsToDisplay,
      shouldShowVisibleItems: numberOfItemsToDisplay !== 0,
    };
  }, [items, numberOfItemsToDisplay]);

  const onPopoverButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      e.stopPropagation();
      setIsOverflowPopoverOpen((isOpen) => !isOpen);
    },
    []
  );

  const closePopover = useCallback(() => {
    setIsOverflowPopoverOpen(false);
  }, []);

  if (!hasOverflowItems) {
    return (
      <PopoverItemsWrapper data-test-subj={dataTestPrefix} alignItems="center" gutterSize="s">
        {items.map(renderItem)}
      </PopoverItemsWrapper>
    );
  }

  return (
    <PopoverItemsWrapper alignItems="center" gutterSize="s" data-test-subj={dataTestPrefix}>
      {shouldShowVisibleItems && (
        <EuiFlexItem grow={1} className="eui-textTruncate">
          {visibleItems.map(renderItem)}
        </EuiFlexItem>
      )}
      <EuiPopover
        ownFocus
        aria-label={popoverTitle ?? popoverButtonTitle}
        data-test-subj={`${dataTestPrefix}DisplayPopover`}
        button={
          <EuiBadge
            iconType={popoverButtonIcon}
            color="hollow"
            data-test-subj={`${dataTestPrefix}DisplayPopoverButton`}
            onClick={onPopoverButtonClick}
            onClickAriaLabel={popoverButtonTitle}
          >
            {popoverButtonTitle}
          </EuiBadge>
        }
        isOpen={isOverflowPopoverOpen}
        closePopover={closePopover}
        repositionOnScroll
      >
        {popoverTitle ? (
          <EuiPopoverTitle data-test-subj={`${dataTestPrefix}DisplayPopoverTitle`}>
            {popoverTitle}
          </EuiPopoverTitle>
        ) : null}
        <PopoverWrapper data-test-subj={`${dataTestPrefix}DisplayPopoverWrapper`}>
          {overflowItems.map(renderItem)}
        </PopoverWrapper>
      </EuiPopover>
    </PopoverItemsWrapper>
  );
};

const MemoizedPopoverItems = React.memo(PopoverItemsComponent);
MemoizedPopoverItems.displayName = 'PopoverItems';

export const PopoverItems = MemoizedPopoverItems as typeof PopoverItemsComponent;
