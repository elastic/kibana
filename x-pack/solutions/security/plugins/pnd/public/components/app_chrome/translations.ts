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

/**
 * Labels for the two global Watches sections, shared by the Watches subnav and the deep links
 * registered in `deep_links.ts`.
 *
 * They live here, next to the other deep-link titles, rather than in `pages/watches/translations.ts`
 * where the rest of the section's copy sits: `deep_links.ts` is reachable synchronously from
 * `plugin.ts`, so anything it imports lands in the page-load bundle. Importing two constants from the
 * section's translations module drags all of that module's messages in with them — `i18n.translate`
 * is a call, so no bundler can drop the unused ones — which cost ~2.9kB of page-load budget. Keep
 * the ids as-is; only the definition site moved.
 */
export const SUBNAV_WORKERS = i18n.translate('xpack.pnd.watches.subnav.workers', {
  defaultMessage: 'Workers',
});

export const SUBNAV_SKILLS = i18n.translate('xpack.pnd.watches.subnav.skills', {
  defaultMessage: 'Skills',
});

export const ASK_PND_LABEL = i18n.translate('xpack.pnd.chrome.askPnd', {
  defaultMessage: 'Ask PND',
});
