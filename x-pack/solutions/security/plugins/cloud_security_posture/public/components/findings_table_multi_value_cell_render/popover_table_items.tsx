/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiBadgeGroup, EuiBadge } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getShowMoreAriaLabel } from '../../pages/vulnerabilities/translations';

interface PopoverItemsProps<T> {
  items: T[];
  renderItem: (item: T, index: number, field: string) => React.ReactNode;
  field: string;
}

const PopoverTableItemsComponent = <T extends unknown>({
  items,
  renderItem,
  field,
}: PopoverItemsProps<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
          onClick={onButtonClick}
          onClickAriaLabel={getShowMoreAriaLabel(field, items.length - 1)}
        >
          +
          <FormattedMessage
            id="xpack.csp.findings.moreWithCount"
            defaultMessage="{count} more"
            values={{ count: items.length - 1 }}
          />
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
    >
      <EuiBadgeGroup
        gutterSize="s"
        css={css`
          max-height: 130px;
          max-width: 490px;
          overflow-y: auto;
        `}
      >
        {items.slice(1).map((item, index) => renderItem(item, index, field))}
      </EuiBadgeGroup>
    </EuiPopover>
  );
};

const MemoizedPopoverTableItems = React.memo(PopoverTableItemsComponent);
MemoizedPopoverTableItems.displayName = 'PopoverTableItems';

export const PopoverTableItems = MemoizedPopoverTableItems as typeof PopoverTableItemsComponent;
