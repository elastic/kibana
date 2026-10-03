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
  // Covers every way a decision can be refused once the proposal is no longer `pending` —
  // already decided, settled as expired, or otherwise superseded — since the route maps all
  // of those to the same conflict.
  409: i18n.translate('xpack.alertzero.queue.decisionConflict', {
    defaultMessage:
      'This action is no longer available to decide. Reload to see the current queue.',
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

export const PROPOSED_ACTIONS_SHOW_MORE_LABEL = i18n.translate(
  'xpack.alertzero.detailsFlyout.proposedActions.showMore',
  { defaultMessage: 'Show more proposed actions' }
);

export const BACKGROUND_WORK_TITLE = i18n.translate('xpack.alertzero.queue.backgroundWork.title', {
  defaultMessage: 'Workers are running in the background',
});

export const BACKGROUND_WORK_BODY = i18n.translate('xpack.alertzero.queue.backgroundWork.body', {
  defaultMessage:
    'Nothing needs your attention right now. Proposed actions will appear here as workers find them.',
});
