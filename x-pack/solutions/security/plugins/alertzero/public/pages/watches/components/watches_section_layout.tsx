/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTitle } from '@kbn/app-header';
import type { AppMenuItemType, AppMenuPrimaryActionItem } from '@kbn/app-menu';
import {
  ALERTZERO_WATCH_SETTINGS_WIDTH,
  ALERTZERO_WATCHES_SUBNAV_WIDTH,
} from '../../../components/layout/constants';
import { useAlertZeroDocumentationLink } from '../../../hooks/use_alertzero_documentation_link';
import { AlertZeroWatchesNav, type WatchesSectionId } from './alertzero_watches_nav';

/**
 * Height of `#app-main-scroll`. The shell fills that pane so the chrome scrollbar stays idle
 * and the settings section below the page header is the scroller.
 */
const WATCHES_SHELL_HEIGHT = `calc(
  var(--kbn-layout--application-height, 100vh) -
    var(--kbn-layout--application-margin-top, 0px) -
    var(--kbn-layout--application-margin-bottom, 0px)
)`;

interface WatchesSectionLayoutProps {
  active: WatchesSectionId;
  title: AppHeaderTitle;
  badges?: AppHeaderBadge[];
  /** Rendered to the left of the header's overflow menu, e.g. a watch's Enabled toggle. */
  headerSwitch?: AppHeaderMenu['switch'];
  /** Primary action button pinned to the sticky header, e.g. a page's Save action. */
  headerPrimaryActionItem?: AppMenuPrimaryActionItem;
  /** Secondary header buttons rendered ahead of the overflow menu, e.g. a page's Discard action. */
  headerItems?: AppMenuItemType[];
  children: React.ReactNode;
}

/**
 * Page shell for every Watches route: `EuiPageTemplate` with the watch subnav in its sidebar slot and
 * an `AppHeader` above the content.
 */
export const WatchesSectionLayout: React.FC<WatchesSectionLayoutProps> = ({
  active,
  title,
  badges,
  headerSwitch,
  headerPrimaryActionItem,
  headerItems,
  children,
}) => {
  const docLink = useAlertZeroDocumentationLink();
  const menu = useMemo<AppHeaderMenu | undefined>(
    () =>
      headerSwitch || headerPrimaryActionItem || headerItems
        ? {
            switch: headerSwitch,
            primaryActionItem: headerPrimaryActionItem,
            items: headerItems,
          }
        : undefined,
    [headerSwitch, headerPrimaryActionItem, headerItems]
  );

  return (
    <EuiPageTemplate
      offset={0}
      grow={false}
      minHeight={0}
      restrictWidth={false}
      data-test-subj="alertZeroWatchesSectionLayout"
      css={css`
        height: ${WATCHES_SHELL_HEIGHT};
        max-height: ${WATCHES_SHELL_HEIGHT};
        overflow: hidden;
      `}
      mainProps={{
        // `style`, not `css`: EuiPageInner spreads `mainProps` after its own `css`, so a `css`
        // prop would replace the panel, border, and flex styles.
        style: { minHeight: 0, height: '100%', overflow: 'hidden' },
      }}
    >
      {/**
       * `sticky` must be passed explicitly. The EUI docs claim `EuiPageTemplate` makes its sidebar
       * sticky by default and that you opt out with `sticky={false}`, but the template never sets
       * it and `EuiPageSidebar` defaults to `sticky = false`.
       *
       * The settings column scrolls on its own, under the page header. The subnav stays full height
       * and, when it is taller than the pane, scrolls on its own — `sticky` brings `overflow-y: auto`
       * and a max-height with it. Nothing here may introduce an `overflow` ancestor between this
       * sidebar and the chrome scroll container; see the note in `app_chrome_layout.tsx`.
       */}
      <EuiPageTemplate.Sidebar
        paddingSize="none"
        minWidth={ALERTZERO_WATCHES_SUBNAV_WIDTH}
        sticky
        css={css`
          /**
           * EUI sets max-block-size via inline style to calc(100vh - euiFixedHeadersOffset).
           * Kibana's grid layout sets --euiFixedHeadersOffset: 0 ("no fixed header"), so EUI
           * produces max-block-size: 100vh. But the actual scroll container (#app-main-scroll)
           * is shorter — it sits inside an application grid cell that is already inset from the
           * viewport by Kibana's header height and margins. The sidebar stretches (flex-grow: 1)
           * to the container height but is capped at max-block-size: 100vh, which is too tall by
           * exactly that chrome overhead. At the bottom of a tall page the sidebar unsticks and
           * scrolls by that same amount.
           *
           * Using Kibana's --kbn-layout--application-height (100vh minus chrome overhead) and
           * subtracting the app's own top/bottom margins gives us the exact scroll container
           * height so the sidebar stays stuck all the way to the last scroll pixel.
           *
           * !important is required because EUI applies this via an inline style.
           */
          max-block-size: ${WATCHES_SHELL_HEIGHT} !important;
        `}
      >
        <AlertZeroWatchesNav active={active} />
      </EuiPageTemplate.Sidebar>
      <AppHeader title={title} badges={badges} menu={menu} spacing="compact" docLink={docLink} />
      <EuiPageTemplate.Section
        paddingSize="l"
        grow
        style={{ minHeight: 0, overflowX: 'hidden', overflowY: 'auto' }}
        contentProps={{
          css: css`
            width: ${ALERTZERO_WATCH_SETTINGS_WIDTH}px;
            max-width: 100%;
            margin-inline: auto;
          `,
        }}
      >
        {children}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
