/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink } from '@kbn/core/public';
import { SecurityPageName } from '@kbn/deeplinks-security';
// Page-load critical: this module is reachable synchronously from `plugin.ts`, so it must not import
// from `pages/**`. Every title it needs lives in the chrome translations module for that reason.
import * as i18n from './components/app_chrome/translations';

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
  },
];
