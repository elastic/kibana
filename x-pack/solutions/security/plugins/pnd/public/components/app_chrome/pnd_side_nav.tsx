/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSideNav, useEuiTheme, type EuiSideNavItemType } from '@elastic/eui';
import { css } from '@emotion/react';
import { useHistory, useLocation } from 'react-router-dom';
import * as i18n from './translations';

/**
 * In-app left navigation for PND. Rendered by the app itself so the rail is
 * present in classic Kibana as well as serverless (where the Security solution
 * side nav also surfaces the same deep links). Mirrors the Throughline
 * prototype app shell: a Watch Floor home item, an "Operate" group, and an
 * "Autonomous" group for Watches.
 */
export const PndSideNav: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { pathname } = useLocation();

  const go = (path: string) => (event?: React.MouseEvent) => {
    event?.preventDefault();
    history.push(path);
  };

  const isSelected = (path: string, exact = false) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

  const items: Array<EuiSideNavItemType<unknown>> = useMemo(
    () => [
      {
        id: 'watch-floor',
        name: i18n.NAV_WATCH_FLOOR,
        href: '/',
        onClick: go('/'),
        isSelected: isSelected('/', true),
        icon: undefined,
      },
      {
        id: 'operate',
        name: i18n.NAV_GROUP_OPERATE,
        items: [
          {
            id: 'chats',
            name: i18n.NAV_CHATS,
            href: '/chats',
            onClick: go('/chats'),
            isSelected: isSelected('/chats'),
          },
          {
            id: 'dashboards',
            name: i18n.NAV_DASHBOARDS,
            href: '/dashboards',
            onClick: go('/dashboards'),
            isSelected: isSelected('/dashboards'),
          },
          {
            id: 'alerts',
            name: i18n.NAV_ALERTS,
            href: '/alerts',
            onClick: go('/alerts'),
            isSelected: isSelected('/alerts'),
          },
          {
            id: 'attacks',
            name: i18n.NAV_ATTACKS,
            href: '/attacks',
            onClick: go('/attacks'),
            isSelected: isSelected('/attacks'),
          },
          {
            id: 'records',
            name: i18n.NAV_RECORDS,
            href: '/records',
            onClick: go('/records'),
            isSelected: isSelected('/records'),
          },
          {
            id: 'threat-hunt',
            name: i18n.NAV_THREAT_HUNT,
            href: '/threat-hunt',
            onClick: go('/threat-hunt'),
            isSelected: isSelected('/threat-hunt'),
          },
          {
            id: 'streams',
            name: i18n.NAV_STREAMS,
            href: '/streams',
            onClick: go('/streams'),
            isSelected: isSelected('/streams'),
          },
        ],
      },
      {
        id: 'agent',
        name: i18n.NAV_GROUP_AGENT,
        items: [
          {
            id: 'watches',
            name: i18n.NAV_WATCHES,
            href: '/watches',
            onClick: go('/watches'),
            isSelected: isSelected('/watches'),
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname]
  );

  return (
    <nav
      css={css`
        flex: 0 0 auto;
        width: 208px;
        padding: ${euiTheme.size.m};
        border-right: ${euiTheme.border.thin};
        background: ${euiTheme.colors.emptyShade};
        overflow-y: auto;
      `}
      data-test-subj="pndSideNav"
    >
      <EuiSideNav aria-label="PND" items={items} />
    </nav>
  );
};
