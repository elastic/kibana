/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../../common/proposals/origin';
import type { RunPackageReportDeps } from './run_package_report';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

/**
 * Implements {@link RunPackageReportDeps.hasExistingProposals} -- see that type's own doc comment
 * for the invariant this backs (any status counts, including settled). `excludeSuperseded` /
 * `excludeExpired` are passed explicit `false` here rather than left to the schema's own default,
 * which is how "any status" is actually achieved. Scoped by `origin` so another solution's
 * Proposal on the same conversation, however unlikely, never false-positives the guard.
 *
 * Logs and rethrows on a lookup failure rather than swallowing it: the caller
 * (`run_package_report.ts`) is what decides to fail closed, and separately records that the skip
 * was because the check itself failed, not because Proposals were actually found.
 */
export const createExistingProposalsChecker = ({
  proposalsService,
  spaceId,
  request,
  logger,
}: {
  proposalsService: ProposalsService;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
}): RunPackageReportDeps['hasExistingProposals'] => {
  return async (conversationId) => {
    try {
      const { total } = await proposalsService.list(
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
      );
      return total > 0;
    } catch (err) {
      logger?.warn(
        `package_report: could not check for existing proposals on ${conversationId}: ${
          (err as Error).message
        }`
      );
      throw err;
    }
  };
};
