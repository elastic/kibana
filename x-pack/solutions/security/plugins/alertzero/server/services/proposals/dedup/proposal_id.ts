/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../common/proposals/origin';

/**
 * Fixed namespace for AlertZero Proposal ids. Frozen: changing it renames every id, so a rerun
 * would stop finding the Proposal an earlier run created and mint a second one beside it.
 */
const PROPOSAL_UUID_NAMESPACE = '9b2e4d17-5c3a-5f08-8a61-3e7d1c4b9a25';

/**
 * The id a Proposal is created under, derived from what it proposes. Two runs that propose the
 * same thing compute the same id, and the Proposals service's `op_type: 'create'` decides which
 * one creates it.
 *
 * - `subjectKey` says what is proposed (see `buildProposalSubjectKey`): the action and its target,
 *   not the Investigation. Any AlertZero worker proposing the same action on the same target lands
 *   on the same id.
 * - `generation` lets a settled Proposal be followed by a new one. An id can only ever be created
 *   once, so once a Proposal is decided or expired the caller moves to the next generation.
 * - `spaceId` is in the hash because the proposals index is shared across spaces and the service
 *   does not scope the id.
 */
export const buildProposalId = ({
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
    PROPOSAL_UUID_NAMESPACE
  );
