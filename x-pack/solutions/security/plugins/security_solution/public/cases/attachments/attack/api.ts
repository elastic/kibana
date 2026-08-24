/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { getCaseBulkDeleteAttachmentsUrl } from '@kbn/cases-plugin/common/api';
import { MAX_BULK_DELETE_ATTACHMENTS } from '@kbn/cases-plugin/common/constants';

export interface BulkDeleteCaseAttachmentsParams {
  http: HttpSetup;
  /** The case the attachments belong to. */
  caseId: string;
  /** Attachment saved object ids to delete. */
  attachmentIds: readonly string[];
  signal?: AbortSignal;
}

/**
 * Deletes several attachments from a case in one request via the Cases bulk-delete endpoint.
 *
 * The endpoint is all-or-nothing: it fails without deleting anything if any id is not an
 * attachment of the case, which is what makes removing an attack and the alerts it brought in
 * a single atomic step rather than a loop of single deletes that can half-succeed.
 *
 * The endpoint accepts at most {@link MAX_BULK_DELETE_ATTACHMENTS} ids per request. An attack
 * can carry far more alerts than that, so larger sets are sent as sequential batches — the
 * attack attachment goes in the first batch so a failure part-way through can never leave the
 * attack behind while its alerts are gone. Callers pass the attack id first.
 */
export const bulkDeleteCaseAttachments = async ({
  http,
  caseId,
  attachmentIds,
  signal,
}: BulkDeleteCaseAttachmentsParams): Promise<void> => {
  if (attachmentIds.length === 0) {
    return;
  }

  const url = getCaseBulkDeleteAttachmentsUrl(caseId);

  for (let start = 0; start < attachmentIds.length; start += MAX_BULK_DELETE_ATTACHMENTS) {
    const ids = attachmentIds.slice(start, start + MAX_BULK_DELETE_ATTACHMENTS);
    await http.post<void>(url, { body: JSON.stringify({ ids }), signal });
  }
};
