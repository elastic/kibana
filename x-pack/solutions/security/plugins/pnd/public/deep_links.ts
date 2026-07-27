/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink } from '@kbn/core/public';
import { PND_DEEP_LINK } from './components/app_chrome/translations';
import * as i18n from './components/app_chrome/translations';

/** Deep links for Security solution nav + global search (Discover + Dashboards are owned elsewhere). */
export const getPndDeepLinks = (): AppDeepLink[] => [
  {
    id: PND_DEEP_LINK.chats,
    title: i18n.NAV_CHATS,
    path: '/chats',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: PND_DEEP_LINK.alerts,
    title: i18n.NAV_ALERTS,
    path: '/alerts',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: PND_DEEP_LINK.attacks,
    title: i18n.NAV_ATTACKS,
    path: '/attacks',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: PND_DEEP_LINK.records,
    title: i18n.NAV_RECORDS,
    path: '/records',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: PND_DEEP_LINK.threatHunt,
    title: i18n.NAV_THREAT_HUNT,
    path: '/threat-hunt',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: PND_DEEP_LINK.streams,
    title: i18n.NAV_STREAMS,
    path: '/streams',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
  {
    id: PND_DEEP_LINK.watches,
    title: i18n.NAV_WATCHES,
    path: '/watches',
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
];
