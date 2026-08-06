/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RecommendedAction } from '@kbn/pnd-common';

export const PAGE_TITLE = i18n.translate('xpack.pnd.brief.pageTitle', {
  defaultMessage: 'Brief',
});

export const greetingEmphasis = (count: number) =>
  i18n.translate('xpack.pnd.brief.greetingEmphasis', {
    defaultMessage:
      '{count, plural, one {# investigation needs} other {# investigations need}} you.',
    values: { count },
  });

export const GREETING_PREFIX = i18n.translate('xpack.pnd.brief.greetingPrefix', {
  defaultMessage: 'Good afternoon.',
});

export const autonomousSubline = (count: number) =>
  i18n.translate('xpack.pnd.brief.autonomousSubline', {
    defaultMessage:
      'While you were away I resolved {count, plural, one {# investigation} other {# investigations}} on my own.',
    values: { count },
  });

export const CLEAR_SUBLINE = i18n.translate('xpack.pnd.brief.clearSubline', {
  defaultMessage:
    'Nothing was resolved autonomously — the queue below is everything that needs you.',
});

export const BUCKET_CONTAIN = i18n.translate('xpack.pnd.brief.bucket.contain', {
  defaultMessage: 'Contain',
});

export const BUCKET_ESCALATE = i18n.translate('xpack.pnd.brief.bucket.escalate', {
  defaultMessage: 'Escalate',
});

export const BUCKET_INVESTIGATE = i18n.translate('xpack.pnd.brief.bucket.investigate', {
  defaultMessage: 'Investigate',
});

export const BUCKET_TUNE = i18n.translate('xpack.pnd.brief.bucket.tune', {
  defaultMessage: 'Tune',
});

export const ALL_BUCKET = i18n.translate('xpack.pnd.brief.bucket.all', {
  defaultMessage: 'All',
});

export const WATCHED_BY = i18n.translate('xpack.pnd.brief.watchedBy', {
  defaultMessage: 'Watched by',
});

export const IN_MOTION = i18n.translate('xpack.pnd.brief.inMotion', {
  defaultMessage: 'In motion',
});

export const pendingProposalsLabel = (count: number) =>
  i18n.translate('xpack.pnd.brief.pendingProposals', {
    defaultMessage: '{count, plural, one {# pending proposal} other {# pending proposals}}',
    values: { count },
  });

export const OPEN_CHAT = i18n.translate('xpack.pnd.brief.openChat', {
  defaultMessage: 'Open in chat',
});

export const AFFECTED_SURFACES = i18n.translate('xpack.pnd.brief.affectedSurfaces', {
  defaultMessage: 'Affected surfaces',
});

export const DEFAULT_SEVERITY = i18n.translate('xpack.pnd.brief.defaultSeverity', {
  defaultMessage: 'medium',
});

export const EMPTY_VALUE = i18n.translate('xpack.pnd.brief.emptyValue', {
  defaultMessage: '—',
});

export const LOADING = i18n.translate('xpack.pnd.brief.loading', {
  defaultMessage: 'Loading investigations…',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.brief.loadError', {
  defaultMessage: 'Unable to load the investigation queue.',
});

export const EMPTY_BUCKET = i18n.translate('xpack.pnd.brief.emptyBucket', {
  defaultMessage: 'No investigations in this bucket.',
});

export const WATCH_TIER_FLOOR = i18n.translate('xpack.pnd.brief.watchTier.floor', {
  defaultMessage: 'Watch Floor',
});

export const WATCH_TIER_OFFICER = i18n.translate('xpack.pnd.brief.watchTier.officer', {
  defaultMessage: 'Watch Officer',
});

export const WATCH_TIER_DARK = i18n.translate('xpack.pnd.brief.watchTier.dark', {
  defaultMessage: 'Dark Watch',
});

export const WATCH_TIER_DEEP = i18n.translate('xpack.pnd.brief.watchTier.deep', {
  defaultMessage: 'Deep Watch',
});

export const WATCH_TIER_DETECTION = i18n.translate('xpack.pnd.brief.watchTier.detection', {
  defaultMessage: 'Detection Watch',
});

export const DEFAULT_ACTION = i18n.translate('xpack.pnd.brief.defaultAction', {
  defaultMessage: 'Review',
});

export type BriefBucket = 'all' | RecommendedAction;

export const BRIEF_BUCKETS: Array<{ id: Exclude<BriefBucket, 'all'>; label: string }> = [
  { id: 'contain', label: BUCKET_CONTAIN },
  { id: 'escalate', label: BUCKET_ESCALATE },
  { id: 'investigate', label: BUCKET_INVESTIGATE },
  { id: 'tune', label: BUCKET_TUNE },
];

export const watchTierLabel = (tier?: string): string => {
  switch (tier) {
    case 'officer':
      return WATCH_TIER_OFFICER;
    case 'dark':
      return WATCH_TIER_DARK;
    case 'deep':
      return WATCH_TIER_DEEP;
    case 'detection':
      return WATCH_TIER_DETECTION;
    case 'floor':
    default:
      return WATCH_TIER_FLOOR;
  }
};
