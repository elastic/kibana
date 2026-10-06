/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CLOSED_WINDOW_HOURS } from '../../../common/proposals/list';

export const QUEUE_PAGE_INFO = Object.freeze({
  pageTitle: i18n.translate('xpack.alertzero.queue.pageTitle', {
    defaultMessage: 'AlertZero - Proposals queue',
  }),
  assignSuccess: i18n.translate('xpack.alertzero.queue.assignSuccess', {
    defaultMessage: 'Assignees updated',
  }),
  assignError: i18n.translate('xpack.alertzero.queue.assignError', {
    defaultMessage: 'Could not update assignees',
  }),
});

export const COPY_LINK_TOASTS = Object.freeze({
  copied: i18n.translate('xpack.alertzero.queue.copyLinkCopied', {
    defaultMessage: 'Link copied',
  }),
  failed: i18n.translate('xpack.alertzero.queue.copyLinkFailed', {
    defaultMessage: 'Could not copy the link',
  }),
});

export const CLOSED_WINDOW_LABEL = i18n.translate('xpack.alertzero.queue.closedWindowLabel', {
  defaultMessage: 'Last {hours}h',
  values: { hours: CLOSED_WINDOW_HOURS },
});
