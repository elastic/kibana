/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type {
  AppHeaderBadge,
  AppHeaderDescription,
  AppHeaderMenu,
  AppHeaderTitle,
} from '@kbn/app-header';
import { PND_WATCHES_SUBNAV_WIDTH } from '../../../components/layout/constants';
import { PndWatchesNav, type WatchesSectionId } from './pnd_watches_nav';
import { WATCHES_HEADER_MENU_ITEMS } from './watches_header_menu';
import * as i18n from '../translations';

const SUBNAV_COLLAPSED_KEY = 'pnd.watches.subnavCollapsed';

const readCollapsed = (): boolean => {
  try {
    return window.sessionStorage.getItem(SUBNAV_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

interface WatchesSectionLayoutProps {
  active: WatchesSectionId;
  title: AppHeaderTitle;
  description?: AppHeaderDescription;
  badges?: AppHeaderBadge[];
  /** Rendered to the left of the header's overflow menu, e.g. a watch's Enabled toggle. */
  headerSwitch?: AppHeaderMenu['switch'];
  children: React.ReactNode;
}

/**
 * Page shell for every Watches route: `EuiPageTemplate` with the watch subnav in its sidebar slot and
 * an `AppHeader` above the content.
 *
 * The subnav collapse state persists in sessionStorage. While collapsed the sidebar is not rendered
 * at all, so the re-expand control moves into the header's overflow menu — `AppHeader` has no leading
 * slot for a custom control.
 */
export const WatchesSectionLayout: React.FC<WatchesSectionLayoutProps> = ({
  active,
  title,
  description,
  badges,
  headerSwitch,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const setCollapsed = useCallback((next: boolean) => {
    setIsCollapsed(next);
    try {
      window.sessionStorage.setItem(SUBNAV_COLLAPSED_KEY, String(next));
    } catch {
      // sessionStorage may be unavailable
    }
  }, []);

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      switch: headerSwitch,
      items: isCollapsed
        ? [
            {
              id: 'pndExpandSubnav',
              label: i18n.SUBNAV_EXPAND,
              iconType: 'menuRight',
              run: () => setCollapsed(false),
              testId: 'pndWatchesSubnavExpand',
            },
            ...WATCHES_HEADER_MENU_ITEMS,
          ]
        : WATCHES_HEADER_MENU_ITEMS,
    }),
    [headerSwitch, isCollapsed, setCollapsed]
  );

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="pndWatchesSectionLayout">
      {!isCollapsed ? (
        /**
         * `sticky` must be passed explicitly. The EUI docs claim `EuiPageTemplate` makes its sidebar
         * sticky by default and that you opt out with `sticky={false}`, but the template never sets
         * it and `EuiPageSidebar` defaults to `sticky = false`.
         *
         * With it, the page scrolls as one inside the chrome's application scroll container while the
         * subnav stays pinned, and a subnav taller than the viewport scrolls on its own — `sticky`
         * brings `overflow-y: auto` and `max-height: calc(100vh - offset)` with it. Nothing here may
         * introduce an `overflow` ancestor; see the note in `app_chrome_layout.tsx`.
         */
        <EuiPageTemplate.Sidebar paddingSize="none" minWidth={PND_WATCHES_SUBNAV_WIDTH} sticky>
          <PndWatchesNav active={active} onCollapse={() => setCollapsed(true)} />
        </EuiPageTemplate.Sidebar>
      ) : null}
      <AppHeader title={title} description={description} badges={badges} menu={menu} />
      <EuiPageTemplate.Section paddingSize="l" grow>
        {children}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
