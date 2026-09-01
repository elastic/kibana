/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import type { EuiContextMenuPanelProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_ITEM_ACTIONS_MENU_ARIA_LABEL } from './translations';

export interface ExceptionItemCardHeaderProps {
  item: ExceptionListItemSchema;
  actions: Array<{ key: string; icon: string; label: string; onClick: () => void }>;
  disableActions?: boolean;
  dataTestSubj: string;
}

export const ExceptionItemCardHeader = memo<ExceptionItemCardHeaderProps>(
  ({ item, actions, disableActions = false, dataTestSubj }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onItemActionsClick = () => setIsPopoverOpen((isOpen) => !isOpen);
    const onClosePopover = () => setIsPopoverOpen(false);

    const itemActions = useMemo((): EuiContextMenuPanelProps['items'] => {
      return actions.map((action) => (
        <EuiContextMenuItem
          data-test-subj={`${dataTestSubj}-actionItem-${action.key}`}
          key={action.key}
          icon={action.icon}
          onClick={() => {
            onClosePopover();
            action.onClick();
          }}
        >
          {action.label}
        </EuiContextMenuItem>
      ));
    }, [dataTestSubj, actions]);

    return (
      <EuiFlexGroup data-test-subj={dataTestSubj} justifyContent="spaceBetween">
        <EuiFlexItem grow={9}>
          <EuiTitle size="xs" textTransform="uppercase" data-test-subj={`${dataTestSubj}-title`}>
            <h3>{item.name}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiToolTip
                content={EXCEPTION_ITEM_ACTIONS_MENU_ARIA_LABEL}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  isDisabled={disableActions}
                  aria-label={EXCEPTION_ITEM_ACTIONS_MENU_ARIA_LABEL}
                  iconType="boxesVertical"
                  onClick={onItemActionsClick}
                  data-test-subj={`${dataTestSubj}-actionButton`}
                />
              </EuiToolTip>
            }
            panelPaddingSize="none"
            isOpen={isPopoverOpen}
            closePopover={onClosePopover}
            data-test-subj={`${dataTestSubj}-items`}
            aria-label={EXCEPTION_ITEM_ACTIONS_MENU_ARIA_LABEL}
          >
            <EuiContextMenuPanel items={itemActions} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionItemCardHeader.displayName = 'ExceptionItemCardHeader';
