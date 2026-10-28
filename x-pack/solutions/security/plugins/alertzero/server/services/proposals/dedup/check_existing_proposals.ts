/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../common/proposals/origin';
import { retryTransient } from './retry_transient';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

/**
 * Count of Proposals the Investigation already carries (any status, including settled), before
 * this run's own proposals are minted. It is the baseline `expectedProposalCount` is built on (see
 * below), so the settlement barrier each gate checks accounts for proposals that already existed
 * before this run, not just the ones this run mints. Not a guard: whether a finding gets a
 * Proposal is decided per subject by {@link ResolveProposalSlot}, not by whether the Investigation
 * has any. See the implementation (`check_existing_proposals.ts`) for which statuses count as
 * "existing" and why.
 */
export type CountExistingProposals = (investigationConversationId: string) => Promise<number>;

/**
 * Implements {@link CountExistingProposals} -- see that type's own doc comment for the invariants
 * this backs (any status counts, including settled; also the settlement barrier's baseline).
 * `excludeSuperseded` / `excludeExpired` are passed explicit `false` here rather than left to the
 * schema's own default, which is how "any status" is actually achieved. Scoped by `origin` so
 * another solution's Proposal on the same conversation, however unlikely, never false-positives
 * the guard.
 *
 * A transient failure is retried before it counts as one (see `retryTransient`): a run whose
 * baseline cannot be read mints nothing and is not retried by the next sweep.
 *
 * Logs and rethrows on a lookup failure rather than swallowing it: the caller
 * (`run_package_report.ts`) is what decides to fail closed, and separately records that the skip
 * was because the check itself failed, not because Proposals were actually found.
 */
export const createExistingProposalsCounter = ({
  proposalsService,
  spaceId,
  request,
  logger,
  retry,
}: {
  proposalsService: ProposalsService;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
  retry?: Parameters<typeof retryTransient>[1];
}): CountExistingProposals => {
  return async (conversationId) => {
    try {
      const { total } = await retryTransient(
        () =>
          proposalsService.list(
            {
              conversationId,
              origin: ALERTZERO_PROPOSAL_ORIGIN,
              size: 1,
              from: 0,
              excludeSuperseded: false,
              excludeExpired: false,
            },
            spaceId,
            request
          ),
        retry
      );
      return total;
    } catch (err) {
      logger?.warn(
        `proposal_dedup: could not check for existing proposals on ${conversationId}: ${
          (err as Error).message
        }`
      );
      throw err;
    }
  };
};
