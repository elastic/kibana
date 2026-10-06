/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { OPEN_PROPOSAL_STATUSES } from '../../../../../common/proposals/open_statuses';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../../common/proposals/origin';
import type { HasOpenProposal } from './run_package_report';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

/**
 * Implements {@link HasOpenProposal}: true when the Investigation carries a Proposal in any of
 * {@link OPEN_PROPOSAL_STATUSES}, the same definition of "open" the candidate selection uses
 * (superseded excluded; an expired `pending` is no longer open, an `executing` one keeps running
 * past its original deadline). Logs and rethrows on failure so the caller can fail closed.
 */
export const createOpenProposalChecker = ({
  proposalsService,
  spaceId,
  request,
  logger,
}: {
  proposalsService: ProposalsService;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
}): HasOpenProposal => {
  return async (conversationId) => {
    try {
      for (const status of OPEN_PROPOSAL_STATUSES) {
        const { total } = await proposalsService.list(
          {
            conversationId,
            origin: ALERTZERO_PROPOSAL_ORIGIN,
            status,
            size: 1,
            from: 0,
            excludeSuperseded: true,
            excludeExpired: status === 'pending',
          },
          spaceId,
          request
        );
        if (total > 0) {
          return true;
        }
      }
      return false;
    } catch (err) {
      logger?.warn(
        `package_report: could not check for open proposals on ${conversationId}: ${
          (err as Error).message
        }`
      );
      throw err;
    }
  };
};
