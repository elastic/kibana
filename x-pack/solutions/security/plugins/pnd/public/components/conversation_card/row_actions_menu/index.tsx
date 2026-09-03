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

import * as i18n from '../translations';

export interface RowActionsMenuProps {
  /** The discovery whose lifecycle the menu opens. */
  correlationId: string;
  onViewLifecycle: (correlationId: string) => void;
  /** The row the menu belongs to, so its trigger can name it. */
  title: string;
}

/**
 * The card's overflow menu (annotation 10 / D8).
 *
 * "View lifecycle" used to be a button in the card body, next to the decision buttons. Both moved:
 * the decision to the approval modal, the lifecycle here. What is left on the card is the card.
 *
 * This is also where **navigation to the container** lives, and deliberately so: the 2026-08-18
 * decision took the container type tag off the queue card, and that tag had been the affordance for
 * reaching the container. Both ends of that decision are honoured by one menu item rather than by a
 * badge that has to be a link.
 *
 * One item does both jobs because an investigation's identity **is** its Attack Discovery alert id
 * (ADR-003): the overlay "View lifecycle" opens is the container's own surface, not a second view
 * beside it, so `readInvestigationId(row)` and the id handed to `onViewLifecycle` are the same key
 * derived two ways — which is what `conversation_card.test.tsx` asserts rather than the literal id.
 * ⛔ Do not add a second "open parent" item: it would open the flyout this one already opens. The one
 * row with no parent to reach is `open_investigation`, which parks *before* its container exists;
 * there the item opens the discovery itself, which is the only subject that exists yet.
 *
 * Every click handler here stops propagation. The menu sits inside a card that is itself a button,
 * and a click that reached the card would open the approval modal behind the menu the analyst just
 * opened — which is exactly the trap the prototype comments on.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  correlationId,
  onViewLifecycle,
  title,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const onTriggerClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen((current) => !current);
  }, []);

  const stopRowActivation = useCallback((event: React.KeyboardEvent | React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  const onViewLifecycleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      closeMenu();
      onViewLifecycle(correlationId);
    },
    [correlationId, closeMenu, onViewLifecycle]
  );

  const trigger = (
    <EuiToolTip content={i18n.MORE_ACTIONS} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={i18n.moreActionsAriaLabel(title)}
        color="text"
        css={css`
          flex-shrink: 0;

          /* Subdued until the row is hovered or the trigger is focused, so four ellipses down a
             queue do not read as four actions waiting to be taken. */
          &:not(:hover):not(:focus-visible) {
            color: ${euiTheme.colors.textSubdued};
          }
        `}
        data-test-subj="pndRowActionsMenuButton"
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
      aria-label={i18n.moreActionsAriaLabel(title)}
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
            data-test-subj="pndRowViewLifecycle"
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
