/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { MAX_COMMENT_LENGTH } from '@kbn/proposals-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import {
  TRIAGE_FP_MAX_ALERT_IDS,
  TRIAGE_FP_MAX_AUTOMATIC_REVISION,
} from '../../../alert_triage/fp_pattern_key';
import type { LiveProposal } from './resolve_proposal_slot';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;
type ProposalPrivileges = Pick<
  ReturnType<ProposalsPluginStart['getProposalPrivileges']>,
  'canManage'
>;

export type FpConvergeOutcome =
  | 'revised'
  | 'not_revisable'
  | 'revision_limit'
  | 'alert_cap'
  | 'too_long'
  | 'failed';

const asAlertIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id !== '') : [];

const unionAlertIds = (existing: string[], incoming: readonly string[]): string[] => [
  ...new Set([...existing, ...incoming]),
];

/**
 * Grows a live FP-closure proposal by unioning alert ids into `actionInput` and appending a
 * short batch note to the comment. Hunt's also-raised-by helper is comment-only; Triage needs
 * the alert list to grow so one approval closes every matching false positive.
 */
export const createFpClosureConverger = ({
  proposalsService,
  privileges,
  spaceId,
  request,
  logger,
}: {
  proposalsService: ProposalsService;
  privileges: ProposalPrivileges;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
}) => {
  const attempt = async ({
    live,
    alertIds,
    addedCount,
  }: {
    live: LiveProposal;
    alertIds: readonly string[];
    addedCount: number;
  }): Promise<{ outcome: FpConvergeOutcome; alertIds: string[] }> => {
    if (!live.revisable) {
      return { outcome: 'not_revisable', alertIds: [...alertIds] };
    }
    if (live.revision >= TRIAGE_FP_MAX_AUTOMATIC_REVISION) {
      return { outcome: 'revision_limit', alertIds: [...alertIds] };
    }

    const proposal = await proposalsService.get(live.proposalId, spaceId, request);
    const existingIds = asAlertIds(proposal.actionInput?.alertIds);
    const merged = unionAlertIds(existingIds, alertIds);
    if (merged.length > TRIAGE_FP_MAX_ALERT_IDS) {
      return { outcome: 'alert_cap', alertIds: merged };
    }

    const line = `Alert Triage batch added ${addedCount} alert${
      addedCount === 1 ? '' : 's'
    } (proposal now covers ${merged.length}).`;
    const comment = `${live.comment}\n\n${line}`;
    if (comment.length > MAX_COMMENT_LENGTH) {
      return { outcome: 'too_long', alertIds: merged };
    }
    if (!(await privileges.canManage(request))) {
      logger?.warn(
        `triage_fp_converge: cannot revise proposal ${live.proposalId}: missing manage privilege`
      );
      return { outcome: 'failed', alertIds: merged };
    }

    await proposalsService.revise(
      {
        id: live.proposalId,
        comment,
        actionInput: {
          ...(proposal.actionInput ?? {}),
          alertIds: merged,
          reason: 'false_positive',
        },
      },
      spaceId,
      request
    );
    return { outcome: 'revised', alertIds: merged };
  };

  return async ({
    live,
    alertIds,
  }: {
    live: LiveProposal;
    alertIds: readonly string[];
  }): Promise<{ outcome: FpConvergeOutcome; alertIds: string[] }> => {
    try {
      return await attempt({ live, alertIds, addedCount: alertIds.length });
    } catch (error) {
      if (!(error instanceof ProposalConflictError)) {
        logger?.warn(
          `triage_fp_converge: revise failed for ${live.proposalId}: ${(error as Error).message}`
        );
        return { outcome: 'failed', alertIds: [...alertIds] };
      }
    }

    try {
      const head = await proposalsService.getLatestRevision(live.proposalId, spaceId);
      const reloaded = await proposalsService.get(head.proposalId, spaceId, request);
      return await attempt({
        live: {
          ...live,
          proposalId: head.proposalId,
          comment: reloaded.comment,
          revision: head.revision,
          revisable: head.status === 'pending' && head.decision === undefined,
        },
        alertIds,
        addedCount: alertIds.length,
      });
    } catch (error) {
      logger?.warn(
        `triage_fp_converge: revise failed after conflict for ${live.proposalId}: ${
          (error as Error).message
        }`
      );
      return { outcome: 'failed', alertIds: [...alertIds] };
    }
  };
};
