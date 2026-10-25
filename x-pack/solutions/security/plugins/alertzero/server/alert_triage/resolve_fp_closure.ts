/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import {
  createFpClosureConverger,
  type FpConvergeOutcome,
} from '../services/proposals/dedup/converge_fp_closure';
import {
  buildProposalId,
  createInvestigationOpenChecker,
  createProposalSlotResolver,
  type LiveProposal,
} from '../services/proposals/dedup';
import { groupFpAlertsByPattern } from './fp_pattern_key';
import {
  buildFpPatternKiId,
  readFpPatternKi,
  writeFpPatternKi,
  type FpPatternKiEsClient,
} from './fp_pattern_ki';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;
type ProposalPrivileges = ReturnType<ProposalsPluginStart['getProposalPrivileges']>;

export interface ResolvedFpMintGroup {
  kind: 'mint';
  patternKey: string;
  subjectKey: string;
  alertIds: string[];
  entitySummary: string;
  /** Deterministic root id for generation 0; review/create may still walk generations. */
  proposalId: string;
  kiId: string;
}

export interface ResolvedFpConvergedGroup {
  kind: 'converged';
  patternKey: string;
  subjectKey: string;
  alertIds: string[];
  entitySummary: string;
  conversationId: string;
  proposalId: string;
  outcome: FpConvergeOutcome;
  alertCount: number;
}

export interface ResolveFpClosureResult {
  mint: ResolvedFpMintGroup[];
  converged: ResolvedFpConvergedGroup[];
  /**
   * Conversation to reuse for this batch's narrative when every FP group converged onto the
   * same open Investigation. Undefined → the workflow should create_investigation.
   */
  primaryConversationId?: string;
}

const loadLiveFromKiOrSlot = async ({
  proposalsService,
  privileges,
  isInvestigationOpen,
  spaceId,
  request,
  subjectKey,
  esClient,
  logger,
}: {
  proposalsService: ProposalsService;
  privileges: ProposalPrivileges;
  isInvestigationOpen: (conversationId: string) => Promise<boolean>;
  spaceId: string;
  request: KibanaRequest;
  subjectKey: string;
  esClient?: FpPatternKiEsClient;
  logger?: Logger;
}): Promise<LiveProposal | undefined> => {
  if (esClient) {
    try {
      const ki = await readFpPatternKi({ esClient, spaceId, subjectKey });
      if (ki && ki.status === 'open') {
        try {
          const head = await proposalsService.getLatestRevision(ki.proposalId, spaceId);
          if (
            (head.status === 'pending' || head.status === 'executing') &&
            (await isInvestigationOpen(ki.conversationId))
          ) {
            const proposal = await proposalsService.get(head.proposalId, spaceId, request);
            const expired =
              head.status === 'pending' &&
              proposal.expiresAt !== undefined &&
              Date.parse(proposal.expiresAt) <= Date.now();
            if (!expired && head.decision === undefined) {
              return {
                proposalId: head.proposalId,
                conversationId: proposal.conversationId,
                title: proposal.title,
                comment: proposal.comment,
                revision: head.revision,
                revisable: head.status === 'pending' && head.decision === undefined,
              };
            }
          }
        } catch (error) {
          logger?.debug?.(
            `triage_fp_resolve: KI ${ki.kiId} stale (${(error as Error).message}); falling back to slot walk`
          );
        }
      }
    } catch (error) {
      logger?.warn(
        `triage_fp_resolve: KI lookup failed for ${subjectKey}: ${(error as Error).message}`
      );
    }
  }

  const resolveSlot = createProposalSlotResolver({
    proposalsService,
    privileges,
    isInvestigationOpen,
    // No batch Investigation yet: any other open Investigation owning the subject is fair game.
    investigationConversationId: '',
    spaceId,
    request,
    logger,
  });

  const slot = await resolveSlot({
    subjectKey,
    actionInput: { reason: 'false_positive' },
  });
  return slot.kind === 'converge' ? slot.live : undefined;
};

/**
 * Groups confident FPs by pattern, joins live open proposals when present (KI then Hunt slot),
 * and returns mint groups for the review workflow.
 */
export const resolveFpClosure = async ({
  spaceId,
  ruleId,
  alertIds,
  alerts,
  proposalsService,
  privileges,
  conversationClient,
  request,
  esClient,
  logger,
}: {
  spaceId: string;
  ruleId: string;
  alertIds: readonly string[];
  alerts: ReadonlyArray<Record<string, unknown> & { _id?: string }>;
  proposalsService: ProposalsService;
  privileges: ProposalPrivileges;
  conversationClient: { get: (conversationId: string) => Promise<{ metadata?: Record<string, unknown> }> };
  request: KibanaRequest;
  esClient?: FpPatternKiEsClient;
  logger?: Logger;
}): Promise<ResolveFpClosureResult> => {
  const alertsById = new Map<string, Record<string, unknown>>();
  for (const alert of alerts) {
    const id = typeof alert._id === 'string' ? alert._id : undefined;
    if (id) {
      alertsById.set(id, alert);
    }
  }

  const groups = groupFpAlertsByPattern({ ruleId, alertIds, alertsById });
  const isInvestigationOpen = createInvestigationOpenChecker({
    conversationClient,
    logger,
  });
  const converge = createFpClosureConverger({
    proposalsService,
    privileges,
    spaceId,
    request,
    logger,
  });

  const mint: ResolvedFpMintGroup[] = [];
  const converged: ResolvedFpConvergedGroup[] = [];

  for (const group of groups) {
    const live = await loadLiveFromKiOrSlot({
      proposalsService,
      privileges,
      isInvestigationOpen,
      spaceId,
      request,
      subjectKey: group.subjectKey,
      esClient,
      logger,
    });

    if (live) {
      const { outcome, alertIds: merged } = await converge({
        live,
        alertIds: group.alertIds,
      });
      if (outcome === 'revised' || outcome === 'too_long' || outcome === 'failed') {
        // too_long / failed still treat as converged for queue purposes when the live proposal
        // covers the subject; alerts may need a later mint generation if revise did not land.
      }
      if (outcome === 'revision_limit' || outcome === 'alert_cap' || outcome === 'not_revisable') {
        mint.push({
          kind: 'mint',
          patternKey: group.patternKey,
          subjectKey: group.subjectKey,
          alertIds: group.alertIds,
          entitySummary: group.entitySummary,
          proposalId: buildProposalId({ spaceId, subjectKey: group.subjectKey, generation: 0 }),
          kiId: buildFpPatternKiId({ spaceId, subjectKey: group.subjectKey }),
        });
        continue;
      }

      if (esClient && outcome === 'revised') {
        try {
          await writeFpPatternKi({
            esClient,
            spaceId,
            subjectKey: group.subjectKey,
            patternKey: group.patternKey,
            ruleId,
            proposalId: live.proposalId,
            conversationId: live.conversationId,
            status: 'open',
          });
        } catch (error) {
          logger?.warn(
            `triage_fp_resolve: could not refresh KI for ${group.subjectKey}: ${
              (error as Error).message
            }`
          );
        }
      }

      converged.push({
        kind: 'converged',
        patternKey: group.patternKey,
        subjectKey: group.subjectKey,
        alertIds: group.alertIds,
        entitySummary: group.entitySummary,
        conversationId: live.conversationId,
        proposalId: live.proposalId,
        outcome,
        alertCount: merged.length,
      });
      continue;
    }

    mint.push({
      kind: 'mint',
      patternKey: group.patternKey,
      subjectKey: group.subjectKey,
      alertIds: group.alertIds,
      entitySummary: group.entitySummary,
      proposalId: buildProposalId({ spaceId, subjectKey: group.subjectKey, generation: 0 }),
      kiId: buildFpPatternKiId({ spaceId, subjectKey: group.subjectKey }),
    });
  }

  const conversationIds = [...new Set(converged.map((g) => g.conversationId))];
  const primaryConversationId =
    mint.length === 0 && conversationIds.length === 1 ? conversationIds[0] : undefined;

  return { mint, converged, primaryConversationId };
};
