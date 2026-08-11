/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface BaseActionsProps {
  onOpenParentInChat: () => void;
  onOpenCase: () => void;
  onAssign: () => void;
  onDismiss: () => void;
  'data-test-subj'?: string;
}

export const BaseActions = memo<BaseActionsProps>(
  ({ onOpenParentInChat, onOpenCase, onAssign, onDismiss, 'data-test-subj': dataTestSubj }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleClose = useCallback(() => setIsOpen(false), []);
    const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const button = (
      <EuiToolTip
        content={i18n.translate('xpack.pnd.baseActions.openMenu', {
          defaultMessage: 'More actions',
        })}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
          iconType="boxesVertical"
          color="text"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            handleToggle();
          }}
          aria-label={i18n.translate('xpack.pnd.baseActions.openMenu', {
            defaultMessage: 'More actions',
          })}
        />
      </EuiToolTip>
    );

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          key="openChat"
          icon="productAgent"
          onClick={() => {
            handleClose();
            onOpenParentInChat();
          }}
        >
          {i18n.translate('xpack.pnd.baseActions.openChat', {
            defaultMessage: 'Open parent investigation in chat',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="openCase"
          icon="document"
          onClick={() => {
            handleClose();
            onOpenCase();
          }}
        >
          {i18n.translate('xpack.pnd.baseActions.openCase', {
            defaultMessage: 'Open a case',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="assign"
          icon="user"
          onClick={() => {
            handleClose();
            onAssign();
          }}
        >
          {i18n.translate('xpack.pnd.baseActions.assign', {
            defaultMessage: 'Assign',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="dismiss"
          icon="trash"
          onClick={() => {
            handleClose();
            onDismiss();
          }}
        >
          {i18n.translate('xpack.pnd.baseActions.dismiss', {
            defaultMessage: 'Dismiss',
          })}
        </EuiContextMenuItem>,
      ],
      [handleClose, onAssign, onDismiss, onOpenCase, onOpenParentInChat]
    );

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
          items={items}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-panel` : undefined}
        />
      </EuiPopover>
    );
  }
);

BaseActions.displayName = 'BaseActions';
