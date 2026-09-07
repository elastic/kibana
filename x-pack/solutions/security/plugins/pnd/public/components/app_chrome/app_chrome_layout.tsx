/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeaderView } from '@kbn/app-header';
import { css } from '@emotion/react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import { useLocation } from 'react-router-dom';

/** Routes that render a fixed-height layout of their own and must not be scrolled as one block. */
const FIXED_HEIGHT_ROUTES = ['/chats'];

/**
 * Routes that rely on the chrome's application scroll container (`#kbnChromeLayoutApplication`).
 *
 * These must leave `overflow` at `visible`. Any other value makes this element the containing
 * scrollport for `position: sticky` descendants — and because this element sits in a chain of
 * auto-height flex boxes it never actually scrolls, so nothing anchored to it can ever pin. That is
 * what kept the Watches subnav scrolling away with the page. The chrome's own stylesheet carries the
 * same warning for `#kibana-body`: "DO NOT ADD ANY OVERFLOW BEHAVIORS HERE / It will break the
 * sticky navigation".
 */
const CHROME_SCROLLED_ROUTES = ['/watches'];

const matchesRoute = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname.startsWith(prefix));

interface AppChromeLayoutProps {
  children: React.ReactNode;
}

/**
 * Content shell only — Kibana / Security solution chrome owns the top header
 * and left rail (including Launchpad, Dev Tools, Settings, collapse).
 */
export const AppChromeLayout: React.FC<AppChromeLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const { pathname } = useLocation();

  const overflow = matchesRoute(pathname, FIXED_HEIGHT_ROUTES)
    ? 'hidden'
    : matchesRoute(pathname, CHROME_SCROLLED_ROUTES)
    ? 'visible'
    : 'auto';

  return (
    <>
      <AppHeaderView title="AlertZero" spacing="compact" />
      <div
        css={css`
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: ${overflow};
          background: ${euiTheme.colors.emptyShade};
          background: linear-gradient(
              180deg,
              ${euiTheme.colors.emptyShade} 0%,
              ${euiTheme.colors.backgroundBaseSubdued} 50%,
              ${euiTheme.colors.emptyShade} 100%
            ),
            ${euiTheme.colors.emptyShade};
          box-shadow: 0 1px 2px ${transparentize(euiTheme.colors.shadow, 0.04)};
        `}
        data-test-subj="pndAppChromeLayout"
      >
        {children}
      </div>
    </>
  );
};
