/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink } from '@kbn/core/public';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { SYSTEM_SECURITY_WATCH_CATALOG } from '@kbn/pnd-common';
// Page-load critical: this module is reachable synchronously from `plugin.ts`, so it must not import
// from `pages/**`. Every title it needs lives in the chrome translations module for that reason.
import * as i18n from './components/app_chrome/translations';

/**
 * One deep link per managed watch, so each watch's settings page is reachable from global search
 * without waiting on `list_watches`. The managed five are compile-time constants installed at
 * start-up.
 *
 * Ids come from the catalog rather than `SecurityPageName` because they are derived per watch; names
 * come from it too, since a watch name is catalog data — the same string the API returns — and
 * translating it here would disagree with the rest of the UI.
 */
const watchDeepLinks = (): AppDeepLink[] =>
  SYSTEM_SECURITY_WATCH_CATALOG.map((watch) => ({
    id: watch.deepLinkId,
    title: watch.name,
    path: `/watches/${watch.id}`,
    visibleIn: ['globalSearch'],
  }));

/**
 * Deep links for Security solution nav + global search (Discover + Dashboards are owned elsewhere).
 *
 * Ids are `SecurityPageName` values so the solution navigation can reference the same registry the
 * rest of Security uses, via `pndLink()`.
 */
export const getPndDeepLinks = (): AppDeepLink[] => [
  {
    id: SecurityPageName.pndChats,
    title: i18n.NAV_CHATS,
    path: '/chats',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: SecurityPageName.alerts,
    title: i18n.NAV_ALERTS,
    path: '/alerts',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: SecurityPageName.attacks,
    title: i18n.NAV_ATTACKS,
    path: '/attacks',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: SecurityPageName.pndRecords,
    title: i18n.NAV_RECORDS,
    path: '/records',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: SecurityPageName.pndThreatHunt,
    title: i18n.NAV_THREAT_HUNT,
    path: '/threat-hunt',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: SecurityPageName.pndStreams,
    title: i18n.NAV_STREAMS,
    path: '/streams',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: SecurityPageName.pndWatches,
    title: i18n.NAV_WATCHES,
    path: '/watches',
    visibleIn: ['globalSearch', 'projectSideNav'],
    // Registered but not rendered as nav children — see `pnd_navigation_tree.ts`.
    deepLinks: [
      ...watchDeepLinks(),
      {
        id: SecurityPageName.pndWatchesWorkers,
        title: i18n.SUBNAV_WORKERS,
        path: '/watches/workers',
        visibleIn: ['globalSearch'],
      },
      {
        id: SecurityPageName.pndWatchesSkills,
        title: i18n.SUBNAV_SKILLS,
        path: '/watches/skills',
        visibleIn: ['globalSearch'],
      },
    ],
  },
];
