/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../translations';

interface LibraryActionsMenuProps {
  canRemove: boolean;
  onRemove: () => void;
}

export const LibraryActionsMenu = ({ canRemove, onRemove }: LibraryActionsMenuProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={i18n.LIBRARY_ACTIONS}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiToolTip content={i18n.LIBRARY_ACTIONS} disableScreenReaderOutput>
          <EuiButtonIcon
            display="base"
            size="s"
            iconType="ellipsis"
            aria-label={i18n.LIBRARY_ACTIONS}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj="ruleLibraryActionsButton"
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="remove"
            icon="trash"
            disabled={!canRemove}
            css={{ color: euiTheme.colors.textDanger }}
            onClick={() => {
              setIsOpen(false);
              onRemove();
            }}
            data-test-subj="removeRuleLibraryButton"
          >
            {i18n.REMOVE_LIBRARY}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
