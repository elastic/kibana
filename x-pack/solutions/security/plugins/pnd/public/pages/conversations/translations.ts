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
