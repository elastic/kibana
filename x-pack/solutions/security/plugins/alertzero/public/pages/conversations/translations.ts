/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

/** Keyed by the HTTP status the proposals route returns for a refused decision. */
export const DECISION_ERRORS: Readonly<Record<number | 'default', string>> = Object.freeze({
  400: i18n.translate('xpack.alertzero.queue.decisionInvalidInput', {
    defaultMessage: 'The action rejected its inputs, so nothing was run.',
  }),
  404: i18n.translate('xpack.alertzero.queue.decisionMissing', {
    defaultMessage: 'This action no longer exists. Reload to see the current queue.',
  }),
  409: i18n.translate('xpack.alertzero.queue.decisionConflict', {
    defaultMessage: 'This action was already decided. Reload to see the current queue.',
  }),
  410: i18n.translate('xpack.alertzero.queue.decisionExpired', {
    defaultMessage: 'This action expired before it was submitted, so it was not run.',
  }),
  default: i18n.translate('xpack.alertzero.queue.decisionFailed', {
    defaultMessage: 'The decision could not be submitted. Try again.',
  }),
});

export const PROPOSED_ACTIONS_EMPTY_LABEL = i18n.translate(
  'xpack.alertzero.detailsFlyout.proposedActions.empty',
  { defaultMessage: 'No proposed actions for this investigation.' }
);

export const PROPOSED_ACTIONS_LOAD_ERROR_LABEL = i18n.translate(
  'xpack.alertzero.detailsFlyout.proposedActions.loadError',
  { defaultMessage: 'Unable to load proposed actions. Try refreshing the page.' }
);
