/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';

import React from 'react';
import { COPY_TO_CLIPBOARD } from '../hover_actions/actions/translations';
import { TooltipWithKeyboardShortcut } from '../tooltip_with_keyboard_shortcut';

import { Clipboard } from './clipboard';

/**
 * Renders `children` with an adjacent icon that when clicked, copies `text` to
 * the clipboard and displays a confirmation toast
 */
export const WithCopyToClipboard = React.memo<{
  isHoverAction?: boolean;
  keyboardShortcut?: string;
  showTooltip?: boolean;
  text: string;
  titleSummary?: string;
}>(({ isHoverAction, keyboardShortcut = '', showTooltip = true, text, titleSummary }) => {
  return showTooltip ? (
    <EuiToolTip
      content={
        <TooltipWithKeyboardShortcut
          additionalScreenReaderOnlyContext={text}
          content={COPY_TO_CLIPBOARD}
          shortcut={keyboardShortcut}
          showShortcut={keyboardShortcut !== ''}
        />
      }
    >
      <Clipboard
        content={text}
        isHoverAction={isHoverAction}
        titleSummary={titleSummary}
        toastLifeTimeMs={800}
      />
    </EuiToolTip>
  ) : (
    <Clipboard
      content={text}
      isHoverAction={isHoverAction}
      titleSummary={titleSummary}
      toastLifeTimeMs={800}
    />
  );
});

WithCopyToClipboard.displayName = 'WithCopyToClipboard';
