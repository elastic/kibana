/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PND_PLUGIN_NAME } from '@kbn/pnd-common';

export const BRAND_TITLE = i18n.translate('xpack.pnd.chrome.brand', {
  defaultMessage: PND_PLUGIN_NAME,
});

export const NAV_CHATS = i18n.translate('xpack.pnd.chrome.nav.chats', {
  defaultMessage: 'Chats',
});

export const NAV_WATCH_FLOOR = i18n.translate('xpack.pnd.chrome.nav.watchFloor', {
  defaultMessage: 'Watch Floor',
});

export const NAV_GROUP_OPERATE = i18n.translate('xpack.pnd.chrome.nav.group.operate', {
  defaultMessage: 'Operate',
});

export const NAV_GROUP_AGENT = i18n.translate('xpack.pnd.chrome.nav.group.agent', {
  defaultMessage: 'Autonomous',
});

export const NAV_DASHBOARDS = i18n.translate('xpack.pnd.chrome.nav.dashboards', {
  defaultMessage: 'Dashboards',
});

export const NAV_ALERTS = i18n.translate('xpack.pnd.chrome.nav.alerts', {
  defaultMessage: 'Alerts',
});

export const NAV_ATTACKS = i18n.translate('xpack.pnd.chrome.nav.attacks', {
  defaultMessage: 'Attacks',
});

export const NAV_RECORDS = i18n.translate('xpack.pnd.chrome.nav.records', {
  defaultMessage: 'Records',
});

export const NAV_THREAT_HUNT = i18n.translate('xpack.pnd.chrome.nav.threatHunt', {
  defaultMessage: 'Threat hunt',
});

export const NAV_STREAMS = i18n.translate('xpack.pnd.chrome.nav.streams', {
  defaultMessage: 'Streams',
});

export const NAV_WATCHES = i18n.translate('xpack.pnd.chrome.nav.watches', {
  defaultMessage: 'Watches',
});

export const ASK_PND_LABEL = i18n.translate('xpack.pnd.chrome.askPnd', {
  defaultMessage: 'Ask PND',
});

/** Deep link ids registered on the PND app (excludes platform Discover + Security dashboards). */
export const PND_DEEP_LINK = {
  chats: 'chats',
  alerts: 'alerts',
  attacks: 'attacks',
  records: 'records',
  threatHunt: 'threat_hunt',
  streams: 'streams',
  watches: 'watches',
} as const;
