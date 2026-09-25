/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { HUNT_INVESTIGATION_ID_NAMESPACE } from '../../../../../common/constants';

/**
 * Fixed namespace UUID for Hunt Watch Investigation conversation ids. Arbitrary
 * but frozen: changing it renames every existing Investigation, which breaks
 * the one-Investigation-per-(space, report) identity the hunt-once model
 * depends on.
 */
const HUNT_INVESTIGATION_UUID_NAMESPACE = '6f1a8c2e-2f47-5c4b-9a33-7d2a1b4e6c50';

/**
 * Derives the Investigation conversation id for a report.
 *
 * One enduring Investigation per `(space, report_id)`. The space is not hashed
 * in because the platform's conversation lookup is already space scoped, so
 * including it would be redundant.
 */
export const buildHuntInvestigationConversationId = (reportId: string): string =>
  uuidv5(`${HUNT_INVESTIGATION_ID_NAMESPACE}${reportId}`, HUNT_INVESTIGATION_UUID_NAMESPACE);

/**
 * Subject-stable trigger attachment id: `trigger-{sha256(space|reportId)}`, same
 * hash scheme as `buildSseAttachmentId` (sse_mapper.ts). Fixed per (space,
 * reportId) so a rerun's find-or-create 409s on the existing attachment rather
 * than appending a second copy, and so packaging can resolve the Investigation
 * for a report id outside the current run via
 * `conversations.search({ filter: 'attachment_id: <this id>' })` (section B's
 * documented fallback) without a stored side index.
 */
export const buildHuntTriggerAttachmentId = ({
  spaceId,
  reportId,
}: {
  spaceId: string;
  reportId: string;
}): string => {
  const hash = createHash('sha256').update(`${spaceId}|${reportId}`).digest('hex');
  return `trigger-${hash}`;
};
