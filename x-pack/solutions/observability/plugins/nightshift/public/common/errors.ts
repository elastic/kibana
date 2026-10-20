/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  isSourceWriteConflictReason,
  type SourceWriteConflictReason,
} from '@kbn/significant-events-schema';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getConflictReason = (body: unknown): SourceWriteConflictReason | undefined => {
  if (!isRecord(body) || !isRecord(body.attributes) || !isRecord(body.attributes.data)) {
    return;
  }
  const { reason } = body.attributes.data;
  return isSourceWriteConflictReason(reason) ? reason : undefined;
};

const getBodyMessage = (body: unknown): string | undefined => {
  if (typeof body === 'string') {
    return body;
  }
  if (!isRecord(body)) {
    return;
  }

  return typeof body.message === 'string' ? body.message : undefined;
};

// The workflow engine reports a failed Kibana API step as `HTTP <status>: <response body>`.
const WORKFLOW_HTTP_FAILURE_REGEX = /^HTTP \d{3}: (.+)$/s;

/** Returns the API's own message from a workflow failure, or the failure as reported. */
export const getWorkflowFailureMessage = (failure: string): string => {
  const [, body] = failure.match(WORKFLOW_HTTP_FAILURE_REGEX) ?? [];
  if (body === undefined) {
    return failure;
  }
  try {
    return getBodyMessage(JSON.parse(body)) ?? failure;
  } catch {
    return failure;
  }
};

export const getFormattedError = (error: unknown): Error => {
  if (isRecord(error) && 'body' in error) {
    const reason = getConflictReason(error.body);
    if (reason) {
      return new Error(CONFLICT_MESSAGE_BY_REASON[reason]);
    }

    const message = getBodyMessage(error.body);
    if (message) {
      return new Error(message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown error');
};

const LEASE_HELD_MESSAGE = i18n.translate('xpack.nightshift.common.errors.leaseHeldErrorMessage', {
  defaultMessage: 'This source is being updated. Try again in a few seconds.',
});

const RECONCILE_PENDING_MESSAGE = i18n.translate(
  'xpack.nightshift.common.errors.reconcilePendingErrorMessage',
  {
    defaultMessage:
      'This source is still applying a change to its query. Try again in a few seconds.',
  }
);

const SOURCE_DISABLED_MESSAGE = i18n.translate(
  'xpack.nightshift.common.errors.sourceDisabledErrorMessage',
  {
    defaultMessage: 'This source is disabled. Enable it to change its knowledge indicators.',
  }
);

const STALE_REVISION_MESSAGE = i18n.translate(
  'xpack.nightshift.common.errors.staleRevisionErrorMessage',
  {
    defaultMessage: 'This source changed since the page was loaded. Refresh and try again.',
  }
);

const CONFLICT_MESSAGE_BY_REASON: Record<SourceWriteConflictReason, string> = {
  lease_held: LEASE_HELD_MESSAGE,
  reconcile_pending: RECONCILE_PENDING_MESSAGE,
  source_disabled: SOURCE_DISABLED_MESSAGE,
  stale_revision: STALE_REVISION_MESSAGE,
};

export const BULK_WRITE_CONFLICT_MESSAGE = i18n.translate(
  'xpack.nightshift.common.errors.bulkWriteConflictErrorMessage',
  {
    defaultMessage: 'Some changes were not applied because the source is being updated.',
  }
);
