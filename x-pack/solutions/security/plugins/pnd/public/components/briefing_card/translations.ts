/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BRIEFING_CARD_LABELS = Object.freeze({
  watchedBy: i18n.translate('xpack.pnd.brief.watchedBy', {
    defaultMessage: 'Watched by',
  }),
  inMotion: i18n.translate('xpack.pnd.brief.inMotion', {
    defaultMessage: 'In motion',
  }),
  pendingProposals: (count: number) =>
    i18n.translate('xpack.pnd.brief.pendingProposals', {
      defaultMessage: '{count, plural, one {# pending proposal} other {# pending proposals}}',
      values: { count },
    }),
});

export const BRIEFING_CARD_ACTIONS = Object.freeze({
  openChat: i18n.translate('xpack.pnd.brief.openChat', {
    defaultMessage: 'Open in chat',
  }),
  default: i18n.translate('xpack.pnd.brief.defaultAction', {
    defaultMessage: 'Review',
  }),
  viewDetails: i18n.translate('xpack.pnd.brief.viewDetails', {
    defaultMessage: 'View details',
  }),
});

export const WATCH_TIER_LABELS = Object.freeze({
  officer: i18n.translate('xpack.pnd.brief.watchTier.officer', {
    defaultMessage: 'Watch Officer',
  }),
  dark: i18n.translate('xpack.pnd.brief.watchTier.dark', {
    defaultMessage: 'Dark Watch',
  }),
  deep: i18n.translate('xpack.pnd.brief.watchTier.deep', {
    defaultMessage: 'Deep Watch',
  }),
  floor: i18n.translate('xpack.pnd.brief.watchTier.floor', {
    defaultMessage: 'Watch Floor',
  }),
});
