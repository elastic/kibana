/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { AppHeaderView } from '@kbn/app-header';
import { css } from '@emotion/react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { AppStatus } from '@kbn/core/public';
import type { ApplicationStart, ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { ALERTZERO_APP_ID } from '../../../common/constants';
import {
  useAlertZeroDocumentationLink,
  type AlertZeroDocumentationPage,
} from '../../hooks/use_alertzero_documentation_link';
import { AppHeadingDocLinkContext } from './app_heading_doc_link';
import { AppHeadingTitleContext } from './app_heading_title';
import { BRAND_TITLE, NAV_ESCALATIONS, NAV_WATCHES, SECURITY_BREADCRUMB } from './translations';

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

/**
 * Routes that need the same `overflow: visible` (for a sticky element) but keep the app heading.
 * Matched exactly: `/` is the landing page, which every other route's path also starts with. The
 * app root can also report an empty pathname.
 * The landing page pins the onboarding intro's Continue footer.
 */
const CHROME_SCROLLED_EXACT_ROUTES = ['', '/'];

const matchesRoute = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname.startsWith(prefix));

const getSectionTitle = (pathname: string): string | undefined => {
  if (matchesRoute(pathname, ['/escalations'])) return NAV_ESCALATIONS;
  if (matchesRoute(pathname, ['/watches'])) return NAV_WATCHES;
  return undefined;
};

/**
 * Breadcrumbs for the Classic header. The Security solution nav builds its own from the nav tree
 * and only merges in breadcrumbs that carry a `deepLinkId`, so these leave it unchanged.
 */
const getBreadcrumbs = (
  pathname: string,
  getUrlForApp: ApplicationStart['getUrlForApp'],
  canOpenSecurity: boolean
): ChromeBreadcrumb[] => {
  const sectionTitle = getSectionTitle(pathname);
  return [
    // AlertZero access doesn't imply access to the Security app, so it only links when it can open.
    {
      text: SECURITY_BREADCRUMB,
      ...(canOpenSecurity && { href: getUrlForApp(SECURITY_UI_APP_ID) }),
    },
    { text: BRAND_TITLE, ...(sectionTitle && { href: getUrlForApp(ALERTZERO_APP_ID) }) },
    ...(sectionTitle ? [{ text: sectionTitle }] : []),
  ];
};

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
  const {
    services: { application, chrome },
  } = useKibana<CoreStart>();
  // Set by a page through `useAppHeadingTitle`. Overrides the route's title while it's mounted.
  const [pageTitle, setPageTitle] = useState<string | undefined>();
  // Set by a page through `useAppHeadingDocLink`. `/` hosts both onboarding and Proposed actions,
  // so only the page knows which documentation applies. Falls back to the AlertZero overview.
  const [docLinkPage, setDocLinkPage] = useState<AlertZeroDocumentationPage | undefined>();
  const docLink = useAlertZeroDocumentationLink(docLinkPage ?? 'overview');

  const isWatchesShell = matchesRoute(pathname, CHROME_SCROLLED_ROUTES);
  const isChromeScrolled = isWatchesShell || CHROME_SCROLLED_EXACT_ROUTES.includes(pathname);
  const overflow = isChromeScrolled ? 'visible' : 'auto';
  const hideAppHeading = isWatchesShell;
  const appHeadingTitle = pageTitle ?? getSectionTitle(pathname) ?? BRAND_TITLE;

  // Core leaves out the apps the user can't access.
  const applications = useObservable(application.applications$);
  const canOpenSecurity = applications?.get(SECURITY_UI_APP_ID)?.status === AppStatus.accessible;

  useEffect(() => {
    chrome.setBreadcrumbs(getBreadcrumbs(pathname, application.getUrlForApp, canOpenSecurity));
  }, [application, canOpenSecurity, chrome, pathname]);

  return (
    <AppHeadingTitleContext.Provider value={setPageTitle}>
      <AppHeadingDocLinkContext.Provider value={setDocLinkPage}>
        {hideAppHeading ? null : (
          <AppHeaderView title={appHeadingTitle} spacing="compact" docLink={docLink} />
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
      </AppHeadingDocLinkContext.Provider>
    </AppHeadingTitleContext.Provider>
  );
};
