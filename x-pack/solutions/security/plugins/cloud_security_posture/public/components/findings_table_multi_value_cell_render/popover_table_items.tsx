/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiBadgeGroup, EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getShowMoreAriaLabel } from '../../pages/vulnerabilities/translations';

interface PopoverItemsProps<T, K> {
  items: K[];
  renderItem: (item: K, index: number, field: string, finding: T) => React.ReactNode;
  field: string;
  finding: T;
}

const PopoverTableItemsComponent = <T extends Record<string, any>, K = string>({
  items,
  renderItem,
  field,
  finding,
}: PopoverItemsProps<T, K>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="hollow"
          onClick={onButtonClick}
          onClickAriaLabel={getShowMoreAriaLabel(field, items.length - 1)}
        >
          + {items.length - 1}
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      repositionOnScroll
    >
      <EuiBadgeGroup
        gutterSize="s"
        css={css`
          max-height: 230px;
          overflow-y: auto;
          max-width: min-content;
          width: min-content;
          padding-right: ${euiTheme.size.s};
        `}
      >
        {items.map((item, index) => renderItem(item, index, field, finding))}
      </EuiBadgeGroup>
    </EuiPopover>
  );
};

const MemoizedPopoverTableItems = React.memo(PopoverTableItemsComponent);
MemoizedPopoverTableItems.displayName = 'PopoverTableItems';

export const PopoverTableItems = MemoizedPopoverTableItems as typeof PopoverTableItemsComponent;
