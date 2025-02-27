/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiBadge, EuiScreenReaderOnly } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

export interface TooltipWithKeyboardShortcutProps {
  additionalScreenReaderOnlyContext?: string;
  content: React.ReactNode;
  shortcut: string;
  showShortcut: boolean;
}

const TooltipWithKeyboardShortcutComponent = ({
  additionalScreenReaderOnlyContext = '',
  content,
  shortcut,
  showShortcut,
}: TooltipWithKeyboardShortcutProps) => (
  <>
    <div data-test-subj="content">{content}</div>
    {additionalScreenReaderOnlyContext !== '' && (
      <EuiScreenReaderOnly data-test-subj="additionalScreenReaderOnlyContext">
        <p>{additionalScreenReaderOnlyContext}</p>
      </EuiScreenReaderOnly>
    )}
    {showShortcut && (
      <EuiText color="subdued" data-test-subj="shortcut" size="s" textAlign="center">
        <span>{i18n.PRESS}</span>
        {'\u00a0'}
        <EuiBadge color="hollow">{shortcut}</EuiBadge>
      </EuiText>
    )}
  </>
);

export const TooltipWithKeyboardShortcut = React.memo(TooltipWithKeyboardShortcutComponent);
TooltipWithKeyboardShortcut.displayName = 'TooltipWithKeyboardShortcut';
