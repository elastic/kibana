/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type Investigation } from '@kbn/pnd-common';
import { CardActionIconButton } from './action_icon_button';

interface ActionConfig {
  key: string;
  icon: string;
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
      actions.flatMap(({ key, icon, name, onClick, separator }) => {
        const item = (
          <EuiContextMenuItem
            style={{
              padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
            }}
            key={key}
            icon={icon}
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

export type CardActionType = 'openIncident' | 'dismiss' | 'assign';
export interface BaseActionsProps {
  investigation: Investigation;
  onClickAction: (action: CardActionType, conversationId: Investigation['recordId']) => void;
  'data-test-subj'?: string;
}

export const BaseActions = memo<BaseActionsProps>(
  ({ investigation, onClickAction, 'data-test-subj': dataTestSubj }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleClose = useCallback(() => setIsOpen(false), []);
    const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const button = (
      <CardActionIconButton
        data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
        iconType="boxesVertical"
        tooltipContent={i18n.translate('xpack.pnd.baseActions.openMenu', {
          defaultMessage: 'More actions',
        })}
        onClick={handleToggle}
      />
    );

    const actionConfigs = useMemo<ActionConfig[]>(
      () => [
        {
          key: 'openIncident',
          icon: 'document',
          name: i18n.translate('xpack.pnd.baseActions.openAnIncident', {
            defaultMessage: 'Open an incident',
          }),
          onClick: () => onClickAction('openIncident', investigation.recordId),
          // TODO: Add a isdisabled for actions that are disabled
          // might apply to openIncident if the investigation already has an incident created
        },
        {
          key: 'assign',
          icon: 'user',
          name: i18n.translate('xpack.pnd.baseActions.assign', {
            defaultMessage: 'Assign',
          }),
          onClick: () => onClickAction('assign', investigation.recordId),
          separator: true,
        },
        {
          key: 'dismiss',
          icon: 'trash',
          name: i18n.translate('xpack.pnd.baseActions.dismiss', {
            defaultMessage: 'Dismiss',
          }),
          onClick: () => onClickAction('dismiss', investigation.recordId),
        },
      ],
      [investigation.recordId, onClickAction]
    );

    const items = useContextMenuItems(actionConfigs, handleClose);

    return (
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        data-test-subj={dataTestSubj}
        button={button}
        isOpen={isOpen}
        closePopover={handleClose}
        aria-label={i18n.translate('xpack.pnd.baseActions.popover.ariaLabel', {
          defaultMessage: 'Actions menu',
        })}
      >
        <EuiContextMenuPanel
          css={`
            padding: 0;
          `}
          items={items}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-panel` : undefined}
        />
      </EuiPopover>
    );
  }
);

BaseActions.displayName = 'BaseActions';
