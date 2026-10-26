/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../../common/proposals/origin';

/**
 * Fixed namespace UUID for Hunt Watch Proposal ids. Arbitrary but frozen: changing it renames
 * every id, so a rerun would stop finding the proposal an earlier run created and mint a second
 * one beside it.
 */
const HUNT_PROPOSAL_UUID_NAMESPACE = '9b2e4d17-5c3a-5f08-8a61-3e7d1c4b9a25';

/**
 * Derives the id a Hunt Proposal is created under, so two runs that propose the same thing meet
 * at the same Proposal and the Proposals service's `op_type: 'create'` decides which one creates
 * it. The same idea as {@link buildHuntInvestigationConversationId}, with two differences that
 * come from a Proposal having a life that a conversation does not.
 *
 * `subjectKey` says what is being proposed (see `buildProposalSubjectKey`): the action, the
 * host, process, user or service it acts on, and no Investigation, so two Investigations that
 * reach the same host land on the same Proposal.
 *
 * `generation` is what lets a settled Proposal be followed by a new one. The service refuses an
 * id that already exists and reads nothing, so once a Proposal has been decided or has expired
 * the same id can never be used again; the caller moves to the next generation instead. See
 * `resolveProposalSlot`.
 *
 * The space and the producer are in the hash because the proposals index is shared across
 * spaces and the service does not scope the id: a bare `subjectKey` from two spaces would be one
 * id. This is where that rule is enforced for Proposals; {@link buildHuntInvestigationConversationId}
 * enforces it for the Investigation conversation id, for the same reason.
 */
export const buildHuntProposalId = ({
  spaceId,
  subjectKey,
  generation,
}: {
  spaceId: string;
  subjectKey: string;
  generation: number;
}): string =>
  uuidv5(
    `${spaceId}|${ALERTZERO_PROPOSAL_ORIGIN}|${subjectKey}|${generation}`,
    HUNT_PROPOSAL_UUID_NAMESPACE
  );
