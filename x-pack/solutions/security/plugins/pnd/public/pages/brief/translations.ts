/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const ALL_BUCKET = i18n.translate('xpack.pnd.brief.bucket.all', {
  defaultMessage: 'All',
});

export const AFFECTED_SURFACES = i18n.translate('xpack.pnd.brief.affectedSurfaces', {
  defaultMessage: 'Affected surfaces',
});

export const LOADING = i18n.translate('xpack.pnd.brief.loading', {
  defaultMessage: 'Loading investigations...',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.brief.loadError', {
  defaultMessage: 'Unable to load the investigation queue.',
});

export const EMPTY_BRIEFING_QUEUE = i18n.translate('xpack.pnd.brief.emptyBucket', {
  defaultMessage: 'No items in the queue.',
});
