/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  GRAPH_KEYBOARD_SHORTCUTS_PANEL_CLOSE_ID,
  GRAPH_KEYBOARD_SHORTCUTS_PANEL_ID,
} from '../test_ids';
import { GRAPH_KEYBOARD_SHORTCUTS, type GraphKeyboardShortcut } from './keyboard_shortcuts';

const titleLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.keyboardShortcutsPanel.title',
  {
    defaultMessage: 'Keyboard shortcuts',
  }
);

const closeLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.keyboardShortcutsPanel.close',
  {
    defaultMessage: 'Close keyboard shortcuts',
  }
);

export interface KeyboardShortcutsPanelProps {
  onClose: () => void;
  /** Shortcuts to list, defaults to all graph keyboard shortcuts. */
  shortcuts?: readonly GraphKeyboardShortcut[];
}

/** Popover panel content listing the graph keyboard shortcuts. */
export const KeyboardShortcutsPanel = ({
  onClose,
  shortcuts = GRAPH_KEYBOARD_SHORTCUTS,
}: KeyboardShortcutsPanelProps) => {
  const { euiTheme } = useEuiTheme();

  const keyStyle = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: ${euiTheme.size.xl};
    padding: 0 ${euiTheme.size.s};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.size.base};
    background-color: ${euiTheme.colors.backgroundBasePlain};
    font-family: inherit;
    font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
    font-weight: ${euiTheme.font.weight.medium};
    line-height: ${euiTheme.size.l};
  `;

  return (
    <div
      data-test-subj={GRAPH_KEYBOARD_SHORTCUTS_PANEL_ID}
      css={css`
        width: 240px;
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.m};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{titleLabel}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={closeLabel}
              data-test-subj={GRAPH_KEYBOARD_SHORTCUTS_PANEL_CLOSE_ID}
              onClick={onClose}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        {shortcuts.map(({ id, label, displayKey }) => (
          <EuiFlexItem key={id} grow={false}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {label}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <kbd css={keyStyle}>{displayKey}</kbd>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
