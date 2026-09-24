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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

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

/**
 * Documentation link for the header overflow (⋮) menu. Together with the globally registered
 * feedback handler (rendered by the header itself as a "Feedback" entry), this matches the
 * prototype's overflow menu: Documentation + Give feedback.
 */
const useDocumentationLink = (): string | undefined => {
  const { services } = useKibana<CoreStart>();
  return services.docLinks?.links.securitySolution.guide;
};

interface AppChromeLayoutProps {
  children: React.ReactNode;
}

/**
 * Content shell only — Kibana / Security solution chrome owns the top header
 * and left rail (including Launchpad, Dev Tools, Settings, collapse).
 */
export const AppChromeLayout: React.FC<AppChromeLayoutProps> = ({ children }) => {
  const docLink = useDocumentationLink();
  const { euiTheme } = useEuiTheme();
  const { pathname } = useLocation();

  const isWatchesShell = matchesRoute(pathname, CHROME_SCROLLED_ROUTES);
  const overflow = isWatchesShell ? 'visible' : 'auto';
  const hideAppHeading = isWatchesShell;

  return (
    <>
      {hideAppHeading ? null : (
        <AppHeaderView title="AlertZero" spacing="compact" docLink={docLink} />
      )}
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
        data-test-subj="alertZeroAppChromeLayout"
      >
        {children}
      </div>
    </>
  );
};
