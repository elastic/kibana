/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const QUEUE_PAGE_INFO = Object.freeze({
  pageTitle: i18n.translate('xpack.pnd.queue.pageTitle', {
    defaultMessage: 'PND - Proposals queue',
  }),
  greetingEmphasis: (count: number) =>
    i18n.translate('xpack.pnd.queue.greetingEmphasis', {
      defaultMessage:
        '{count, plural, one {# investigation needs} other {# investigations need}} you.',
      values: { count },
    }),
  greetingPrefix: i18n.translate('xpack.pnd.queue.greetingPrefix', {
    defaultMessage: 'Good afternoon.',
  }),
  autonomousSubline: (count: number) =>
    i18n.translate('xpack.pnd.queue.autonomousSubline', {
      defaultMessage:
        'While you were away I resolved {count, plural, one {# investigation} other {# investigations}} on my own.',
      values: { count },
    }),
  clearSubline: i18n.translate('xpack.pnd.queue.clearSubline', {
    defaultMessage:
      'Nothing was resolved autonomously — the queue below is everything that needs you.',
  }),
  affectedSurfaces: i18n.translate('xpack.pnd.queue.affectedSurfaces', {
    defaultMessage: 'Affected surfaces',
  }),
  loading: i18n.translate('xpack.pnd.queue.loading', {
    defaultMessage: 'Loading investigations...',
  }),
  loadError: i18n.translate('xpack.pnd.queue.loadError', {
    defaultMessage: 'Unable to load the investigation queue.',
  }),
  emptyQueue: i18n.translate('xpack.pnd.queue.emptyQueue', {
    defaultMessage: 'No items in the queue.',
  }),
});
