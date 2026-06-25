/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  CENTER_SHORTCUT,
  DISPLAY_SHORTCUT,
  FIT_TO_SCREEN_SHORTCUT,
  FULL_SCREEN_SHORTCUT,
  PAN_TOOL_SHORTCUT,
  SEARCH_TOOL_SHORTCUT,
  SELECT_TOOL_SHORTCUT,
  ZOOM_IN_SHORTCUT,
  ZOOM_OUT_SHORTCUT,
} from './graph_keyboard_shortcuts';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';

const panelTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.keyboardShortcuts.title',
  { defaultMessage: 'Keyboard shortcuts' }
);

const shortcuts = [
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.select', {
      defaultMessage: 'Select tool',
    }),
    keys: [SELECT_TOOL_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.pan', {
      defaultMessage: 'Pan tool',
    }),
    keys: [PAN_TOOL_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.search', {
      defaultMessage: 'Open search',
    }),
    keys: [SEARCH_TOOL_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.display', {
      defaultMessage: 'Display options',
    }),
    keys: [DISPLAY_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.zoomIn', {
      defaultMessage: 'Zoom in',
    }),
    keys: [ZOOM_IN_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.zoomOut', {
      defaultMessage: 'Zoom out',
    }),
    keys: [ZOOM_OUT_SHORTCUT],
  },
  {
    label: i18n.translate(
      'securitySolutionPackages.csp.graph.controls.keyboardShortcuts.fitToScreen',
      { defaultMessage: 'Fit to screen' }
    ),
    keys: [FIT_TO_SCREEN_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.center', {
      defaultMessage: 'Center graph',
    }),
    keys: [CENTER_SHORTCUT],
  },
  {
    label: i18n.translate(
      'securitySolutionPackages.csp.graph.controls.keyboardShortcuts.fullScreen',
      { defaultMessage: 'Full screen' }
    ),
    keys: [FULL_SCREEN_SHORTCUT],
  },
];

export interface GraphKeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactElement;
}

export const GraphKeyboardShortcutsPanel = ({
  isOpen,
  onClose,
  children,
}: GraphKeyboardShortcutsPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const keysCss = useMemo(
    () => css`
      display: flex;
      gap: ${euiTheme.size.xs};

      & kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        padding: 0 ${euiTheme.size.xs};
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.small};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        color: ${euiTheme.colors.textSubdued};
        font-weight: ${euiTheme.font.weight.medium};
        font-size: ${euiTheme.font.scale.xs};
        line-height: ${euiTheme.size.l};
        text-align: center;
      }
    `,
    [euiTheme]
  );
  const popoverTitleId = useGeneratedHtmlId();
  const fullscreenContext = useGraphFullscreenContext();

  const panelCss = useMemo(
    () => css`
      width: 320px;
      padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
    `,
    [euiTheme]
  );

  return (
    <EuiPopover
      button={children}
      isOpen={isOpen}
      closePopover={onClose}
      anchorPosition="upLeft"
      panelPaddingSize="none"
      aria-labelledby={popoverTitleId}
      container={fullscreenContext?.overlayContainerRef.current ?? undefined}
      data-test-subj="graphKeyboardShortcutsPanel"
    >
      <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
        {panelTitle}
      </EuiPopoverTitle>
      <EuiHorizontalRule margin="none" />
      <div css={panelCss}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {shortcuts.map(({ label, keys }) => (
            <EuiFlexItem key={label}>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="m"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{label}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" css={keysCss}>
                    {keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
