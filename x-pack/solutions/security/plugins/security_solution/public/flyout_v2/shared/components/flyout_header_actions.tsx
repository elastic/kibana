/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { useFlyoutSessionContext } from '../../session_context';
import { SettingsMenu } from './settings_menu';

// Positioned relative to the flyout itself (the nearest positioned ancestor). The inline-end
// offset leaves room for EUI's close button so these sit to its left. Any extra actions (e.g.
// share) render to the left of the settings gear so, left to right, the header reads: extra
// actions, settings, EUI close.
//
// Vertical offset matches the close button. Without a flyout menu that is `size.s`. With a menu,
// EUI recenters the close button using `size.m + border` (see `euiFlyoutMenuStyles`).
const headerButtonsStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  position: absolute;
  inset-inline-end: 36px;
  inset-block-start: ${euiTheme.size.s};

  .euiFlyout:has(.euiFlyoutMenu) & {
    inset-block-start: calc(${euiTheme.size.m} + ${euiTheme.border.width.thin});
  }
`;

export interface FlyoutHeaderActionsProps {
  /**
   * Optional extra action buttons rendered to the LEFT of the settings gear.
   */
  children?: ReactNode;
}

/**
 * Absolutely-positioned group of flyout header actions, rendered top-right of the flyout.
 * Renders any `children` (extra buttons such as share) first, followed by the settings menu
 * gear. The gear is shown only when:
 *  - inside the Security Solution app (it's a Security feature; hidden e.g. inside Discover), and
 *  - this flyout is NOT a child (`session: 'inherit'`) — a child is always an overlay, so the
 *    settings menu's controls are inert there.
 */
export const FlyoutHeaderActions: FC<FlyoutHeaderActionsProps> = memo(({ children }) => {
  const { euiTheme } = useEuiTheme();
  const isSecurityApp = useIsInSecurityApp();
  const { isChildFlyout } = useFlyoutSessionContext();
  const showSettings = isSecurityApp && !isChildFlyout;

  // Avoid rendering an empty positioned group when there is nothing to show.
  if (!showSettings && !children) {
    return null;
  }

  return (
    <EuiFlexGroup
      css={headerButtonsStyles(euiTheme)}
      gutterSize="xs"
      alignItems="center"
      responsive={false}
    >
      {children}
      {showSettings && (
        <EuiFlexItem grow={false}>
          <SettingsMenu />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

FlyoutHeaderActions.displayName = 'FlyoutHeaderActions';
