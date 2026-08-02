/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { stopRowActivation } from '../helpers/stop_row_activation';
import * as i18n from '../translations';
import type { QueueEvent } from '../types';

export interface QueueRowActionsMenuProps {
  event: QueueEvent;
  onViewLifecycle: (event: QueueEvent) => void;
}

/**
 * Overflow for a queue row. Aug 18 dropped "Open parent investigation" from
 * every Actions menu; View lifecycle is the remaining parent-surface affordance.
 */
export const QueueRowActionsMenu: React.FC<QueueRowActionsMenuProps> = ({
  event,
  onViewLifecycle,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const onTriggerClick = useCallback((clickEvent: React.MouseEvent) => {
    stopRowActivation(clickEvent);
    setIsOpen((current) => !current);
  }, []);

  const onViewLifecycleClick = useCallback(
    (clickEvent: React.MouseEvent) => {
      stopRowActivation(clickEvent);
      closeMenu();
      onViewLifecycle(event);
    },
    [closeMenu, event, onViewLifecycle]
  );

  const trigger = (
    <EuiToolTip content={i18n.MORE_ACTIONS} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={i18n.moreActionsAriaLabel(event.title)}
        color="text"
        css={css`
          flex-shrink: 0;

          &:not(:hover):not(:focus-visible) {
            color: ${euiTheme.colors.textSubdued};
          }
        `}
        data-test-subj="pndQueueRowActionsMenuButton"
        iconType="ellipsis"
        isSelected={isOpen}
        onClick={onTriggerClick}
        onKeyDown={stopRowActivation}
        size="s"
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      aria-label={i18n.moreActionsAriaLabel(event.title)}
      button={trigger}
      closePopover={closeMenu}
      isOpen={isOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            css={css`
              border-radius: ${euiTheme.border.radius.medium};
            `}
            data-test-subj="pndQueueRowViewLifecycle"
            icon="inspect"
            key="view-lifecycle"
            onClick={onViewLifecycleClick}
          >
            {i18n.VIEW_LIFECYCLE}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
