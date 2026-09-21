/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * One enduring Investigation per `(space, report_id)`. The space is not part of
 * the hash: the platform's conversation lookup is already space scoped, so
 * hashing the space in as well would be redundant and would make the same
 * report read as a different Investigation depending on where it was derived
 * (settled 2026-09-17, PR 3's open-questions item 9).
 *
 * This lives in PR 3 rather than PR 3b because the candidate-selection gate
 * needs it to spot reports with an open Hunt Proposal, and PR 3b's
 * find-or-create must resolve to the same id. Two copies of this derivation
 * would drift into two Investigations for one report.
 */
export const buildHuntInvestigationConversationId = (reportId: string): string =>
  uuidv5(`${HUNT_INVESTIGATION_ID_NAMESPACE}${reportId}`, HUNT_INVESTIGATION_UUID_NAMESPACE);
