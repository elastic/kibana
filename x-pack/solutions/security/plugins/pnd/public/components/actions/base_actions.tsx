/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  type IconType,
  type EuiContextMenuItemProps,
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';
import type { ConversationsActionsGroupProps } from '../conversation_card';
import { ActionButton } from './action_button';
import { ACTIONS_TRANSLATIONS } from './translations';
import { getActionButtonIconProps } from '../helpers';
import { useOpenInChat } from '../../hooks/use_open_in_chat';

interface ActionConfig {
  color?: EuiContextMenuItemProps['color'];
  disabled?: boolean;
  icon: IconType;
  key: string;
  name: string;
  onClick: () => void;
  /** Inserts a horizontal rule before this item */
  separator?: boolean;
}

const useContextMenuItems = (
  actions: ActionConfig[],
  onClose: () => void
): React.ReactElement[] => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () =>
      actions.flatMap(({ color = 'text', disabled, icon, key, name, onClick, separator }) => {
        const item = (
          <EuiContextMenuItem
            style={{
              padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
            }}
            disabled={disabled}
            icon={icon}
            key={key}
            color={color}
            onClick={(ev) => {
              ev.stopPropagation();
              onClose();
              onClick();
            }}
          >
            {name}
          </EuiContextMenuItem>
        );
        return separator
          ? [<EuiHorizontalRule key={`${key}-separator`} margin="none" />, item]
          : [item];
      }),
    [actions, euiTheme.size.xs, euiTheme.size.m, onClose]
  );
};

export type CardActionType = 'assign' | 'dismiss' | 'openIncident';

export interface BaseActionsProps {
  chatId?: string;
  isFlyout?: boolean;
  onClickAction: (action: CardActionType) => void;
  onClickRecommendedAction?: ConversationsActionsGroupProps['onClickRecommendedAction'];
  primaryActionLabel?: string;
  recommendedAction?: RecommendedAction;
  recordId: string;
  'data-test-subj'?: string;
}

export const BaseActions = memo<BaseActionsProps>(
  ({
    chatId,
    isFlyout = false,
    onClickAction,
    onClickRecommendedAction,
    primaryActionLabel,
    recommendedAction,
    recordId,
    'data-test-subj': dataTestSubj,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
    const onOpenChat = useOpenInChat(chatId);
    const iconProps = getActionButtonIconProps({ recommendedAction });

    const button = isFlyout ? (
      <EuiButton
        color="primary"
        data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
        fill
        iconSide="right"
        iconType="chevronSingleDown"
        onClick={handleToggle}
        size="s"
      >
        {ACTIONS_TRANSLATIONS.buttons.actions}
      </EuiButton>
    ) : (
      <ActionButton
        data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
        iconType="boxesVertical"
        onClick={handleToggle}
        tooltipContent={ACTIONS_TRANSLATIONS.tooltips.openMenu}
      />
    );

    const actionConfigs = useMemo<ActionConfig[]>(
      () => [
        ...(onClickRecommendedAction != null && primaryActionLabel != null
          ? [
              {
                color: iconProps.color,
                icon: iconProps.type,
                key: 'proposedAction',
                name: primaryActionLabel,
                onClick: () => onClickRecommendedAction({ id: recordId }),
              },
            ]
          : []),
        ...(!isFlyout && chatId != null
          ? [
              {
                icon: 'productAgent' as const,
                key: 'openChat',
                name: ACTIONS_TRANSLATIONS.buttons.openInChat,
                onClick: onOpenChat,
              },
            ]
          : []),
        {
          disabled: true,
          icon: 'document',
          key: 'openIncident',
          name: ACTIONS_TRANSLATIONS.buttons.openIncident,
          onClick: () => onClickAction('openIncident'),
        },
        {
          disabled: true,
          icon: 'user',
          key: 'assign',
          name: ACTIONS_TRANSLATIONS.buttons.assign,
          onClick: () => onClickAction('assign'),
          separator: true,
        },
        {
          icon: 'trash',
          key: 'dismiss',
          name: ACTIONS_TRANSLATIONS.buttons.dismiss,
          onClick: () => onClickAction('dismiss'),
        },
      ],
      [
        chatId,
        iconProps.color,
        iconProps.type,
        isFlyout,
        onClickAction,
        onClickRecommendedAction,
        onOpenChat,
        primaryActionLabel,
        recordId,
      ]
    );

    const items = useContextMenuItems(actionConfigs, handleClose);

    return (
      <EuiPopover
        anchorPosition="downRight"
        aria-label={ACTIONS_TRANSLATIONS.popover.ariaLabel}
        button={button}
        closePopover={handleClose}
        data-test-subj={dataTestSubj}
        isOpen={isOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          css={`
            padding: 0;
          `}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-panel` : undefined}
          items={items}
        />
      </EuiPopover>
    );
  }
);

BaseActions.displayName = 'BaseActions';
