/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import type { KibanaRequest } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import {
  createFpOpenPointerStore,
  type StoredFpOpenPointer,
} from '../rule_dispositions/fp_open_pointer_store';
import {
  alertIdsOf,
  buildFpCloseComment,
  findPendingFpCloseProposal,
  MAX_FP_CLOSE_ALERT_IDS,
  unionAlertIds,
  type FpCloseStepDependencies,
  type PendingFpCloseProposal,
} from './fp_close_proposal';

export const COALESCE_FP_CLOSE_PROPOSAL_STEP_ID = 'alertzero.coalesceFpCloseProposal';

/**
 * A pointer this recent may belong to a review that has not raised its proposal yet. Waiting for
 * it briefly turns two batches that start together into one proposal instead of two.
 */
const MINT_IN_FLIGHT_WINDOW_MS = 2 * 60 * 1000;
const MINT_IN_FLIGHT_POLL_ATTEMPTS = 3;
const MINT_IN_FLIGHT_POLL_DELAY_MS = 5_000;

/** Revisions of one proposal from concurrent batches race on its sequence number. */
const REVISE_ATTEMPTS = 3;

/** One re-read after a lost pointer write; a second loss raises a proposal of its own. */
const POINTER_WRITE_PASSES = 2;

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

interface CoalesceOutput {
  mode: 'appended' | 'mint';
  proposal_id?: string;
  standing_conversation_id?: string;
  added_count: number;
  total_count: number;
}

const hasErrorName = (error: unknown, name: string): boolean =>
  error instanceof Error && error.name === name;

/**
 * Adds a batch's false positives to the rule's pending closure proposal, or claims the rule's
 * pointer for this batch so the closure review raises the proposal later batches are added to.
 */
export const coalesceFpCloseProposalStepDefinition = ({
  getProposals,
  isPointerStoreAvailable,
  pollDelayMs = MINT_IN_FLIGHT_POLL_DELAY_MS,
}: FpCloseStepDependencies & { pollDelayMs?: number }) =>
  createServerStepDefinition({
    id: COALESCE_FP_CLOSE_PROPOSAL_STEP_ID,
    label: i18n.translate('xpack.alertzero.steps.coalesceFpCloseProposal.label', {
      defaultMessage: 'Coalesce false positive closure proposal',
    }),
    description: i18n.translate('xpack.alertzero.steps.coalesceFpCloseProposal.description', {
      defaultMessage:
        "Adds false positive alerts to the detection rule's pending closure proposal, or reports that a new proposal is needed.",
    }),
    category: StepCategory.Kibana,
    inputSchema: z.object({
      rule_id: z.string().min(1).max(512).describe('Id of the detection rule.'),
      conversation_id: z
        .string()
        .min(1)
        .max(512)
        .describe('Investigation of this batch. A new proposal is raised on it.'),
      fp_candidate_ids: z
        .array(z.string().max(512))
        .min(1)
        .max(MAX_FP_CLOSE_ALERT_IDS)
        .describe('Alert ids of this batch to close as false positives.'),
      rule_name: z.string().max(1024).optional().describe('Name of the rule, for the comment.'),
      confidence_floor: z.number().describe('Confidence floor the candidates passed.'),
    }),
    outputSchema: z.object({
      mode: z
        .enum(['appended', 'mint'])
        .describe(
          '`appended` when the alerts were added to the pending proposal, `mint` when a new proposal is needed.'
        ),
      proposal_id: z.string().optional().describe('Revision that now holds the alerts.'),
      standing_conversation_id: z
        .string()
        .optional()
        .describe('Investigation that holds the pending proposal.'),
      added_count: z.number().describe('Alerts of this batch not already in the proposal.'),
      total_count: z.number().describe('Alerts the proposal closes.'),
    }),
    handler: async (context) => {
      const {
        rule_id: ruleId,
        conversation_id: conversationId,
        fp_candidate_ids: fpCandidateIds,
        rule_name: ruleName,
        confidence_floor: confidenceFloor,
      } = context.input;
      const batchAlertIds = unionAlertIds([], fpCandidateIds);
      const mint = {
        output: {
          mode: 'mint',
          added_count: batchAlertIds.length,
          total_count: batchAlertIds.length,
        } satisfies CoalesceOutput,
      };

      if (!isPointerStoreAvailable) {
        return mint;
      }

      const {
        workflow: { spaceId },
        execution,
      } = context.contextManager.getContext();
      const request = context.contextManager.getFakeRequest();
      const signal = context.abortSignal;
      const proposals = getProposals();
      const service = proposals.getProposalsService();
      const store = createFpOpenPointerStore({
        esClient: context.contextManager.getScopedEsClient(),
        spaceId,
        signal,
      });

      const waitForPendingProposal = async ({
        pointer,
      }: StoredFpOpenPointer): Promise<PendingFpCloseProposal | undefined> => {
        const inFlight = Date.now() - Date.parse(pointer.updatedAt) < MINT_IN_FLIGHT_WINDOW_MS;
        for (let attempt = 0; ; attempt++) {
          const pending = await findPendingFpCloseProposal({
            service,
            conversationId: pointer.conversationId,
            spaceId,
            request,
          });
          if (pending || !inFlight || attempt >= MINT_IN_FLIGHT_POLL_ATTEMPTS) {
            return pending;
          }
          await delay(pollDelayMs, undefined, { signal });
        }
      };

      const appendToPendingProposal = async (
        stored: StoredFpOpenPointer
      ): Promise<CoalesceOutput | undefined> => {
        const pending = await waitForPendingProposal(stored);
        if (!pending) {
          return undefined;
        }
        await proposals.getProposalPrivileges().assertCanManage(request);
        return reviseWithBatch({
          service,
          proposalId: pending.proposalId,
          batchAlertIds,
          spaceId,
          request,
          comment: (alertCount) => buildFpCloseComment({ alertCount, ruleName, confidenceFloor }),
          standingConversationId: stored.pointer.conversationId,
        });
      };

      try {
        for (let pass = 0; pass < POINTER_WRITE_PASSES; pass++) {
          const stored = await store.get(ruleId);
          if (stored) {
            const appended = await appendToPendingProposal(stored);
            if (appended) {
              return { output: appended };
            }
          }

          const written = await store.write(
            { ruleId, conversationId, reviewExecutionId: execution.id },
            stored
          );
          if (written === 'written') {
            return mint;
          }
        }
        context.logger.warn(
          `Lost the open-proposal pointer of rule ${ruleId} twice; raising a closure proposal without it`
        );
        return mint;
      } catch (error) {
        context.logger.warn(
          `Could not coalesce the closure proposal of rule ${ruleId}; the review raises a new one: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        throw error;
      }
    },
  });

/**
 * Revises the live head of a proposal to close the union of its alerts and the batch's. `revise`
 * replaces `alertIds` rather than merging it, so the whole union is sent. Returns `undefined`
 * when the proposal settled, expired or is full, which means the batch needs a proposal of its own.
 */
const reviseWithBatch = async ({
  service,
  proposalId,
  batchAlertIds,
  spaceId,
  request,
  comment,
  standingConversationId,
}: {
  service: ProposalsService;
  proposalId: string;
  batchAlertIds: string[];
  spaceId: string;
  request: KibanaRequest;
  comment: (alertCount: number) => string;
  standingConversationId: string;
}): Promise<CoalesceOutput | undefined> => {
  for (let attempt = 0; attempt < REVISE_ATTEMPTS; attempt++) {
    const head = await service.getLatestRevision(proposalId, spaceId);
    if (head.status !== 'pending' || head.decision !== undefined) {
      return undefined;
    }

    const existing = alertIdsOf(head.actionInput);
    const alertIds = unionAlertIds(existing, batchAlertIds);
    if (alertIds.length > MAX_FP_CLOSE_ALERT_IDS) {
      return undefined;
    }

    const appended = {
      mode: 'appended' as const,
      standing_conversation_id: standingConversationId,
      added_count: alertIds.length - existing.length,
      total_count: alertIds.length,
    };
    if (appended.added_count === 0) {
      return { ...appended, proposal_id: head.proposalId };
    }

    try {
      const revised = await service.revise(
        {
          id: head.proposalId,
          actionInput: { alertIds, reason: 'false_positive' },
          comment: comment(alertIds.length),
        },
        spaceId,
        request
      );
      return { ...appended, proposal_id: revised.proposalId };
    } catch (error) {
      if (hasErrorName(error, 'ProposalExpiredError')) {
        return undefined;
      }
      if (!hasErrorName(error, 'ProposalConflictError')) {
        throw error;
      }
    }
  }
  return undefined;
};
