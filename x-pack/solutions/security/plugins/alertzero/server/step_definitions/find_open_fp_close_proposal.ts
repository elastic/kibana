/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createFpOpenPointerStore } from '../rule_dispositions/fp_open_pointer_store';
import {
  findPendingFpCloseProposal,
  MAX_FP_CLOSE_ALERT_IDS,
  type FpCloseStepDependencies,
} from './fp_close_proposal';

export const FIND_OPEN_FP_CLOSE_PROPOSAL_STEP_ID = 'alertzero.findOpenFpCloseProposal';

const NOT_FOUND = { output: { found: false } } as const;

/**
 * Tells the Alert Triage Worker which Investigation holds its rule's pending false positive
 * closure proposal, so a new batch of the rule joins that Investigation instead of opening one.
 */
export const findOpenFpCloseProposalStepDefinition = ({
  getProposals,
  isPointerStoreAvailable,
}: FpCloseStepDependencies) =>
  createServerStepDefinition({
    id: FIND_OPEN_FP_CLOSE_PROPOSAL_STEP_ID,
    label: i18n.translate('xpack.alertzero.steps.findOpenFpCloseProposal.label', {
      defaultMessage: 'Find open false positive closure proposal',
    }),
    description: i18n.translate('xpack.alertzero.steps.findOpenFpCloseProposal.description', {
      defaultMessage:
        'Finds the Investigation whose false positive closure proposal is still pending for a detection rule.',
    }),
    category: StepCategory.Kibana,
    inputSchema: z.object({
      rule_id: z.string().min(1).max(512).describe('Id of the detection rule.'),
    }),
    outputSchema: z.object({
      found: z
        .boolean()
        .describe('True when the rule has a pending closure proposal that can take more alerts.'),
      conversation_id: z
        .string()
        .optional()
        .describe('Investigation that holds the pending closure proposal.'),
      proposal_id: z.string().optional().describe('Live revision of the pending proposal.'),
      alert_count: z.number().optional().describe('Alerts the pending proposal closes.'),
    }),
    handler: async (context) => {
      if (!isPointerStoreAvailable) {
        return NOT_FOUND;
      }

      const { rule_id: ruleId } = context.input;
      const { spaceId } = context.contextManager.getContext().workflow;
      const store = createFpOpenPointerStore({
        esClient: context.contextManager.getScopedEsClient(),
        spaceId,
        signal: context.abortSignal,
      });

      const stored = await store.get(ruleId);
      if (!stored) {
        return NOT_FOUND;
      }

      const request = context.contextManager.getFakeRequest();
      const proposals = getProposals();
      await proposals.getProposalPrivileges().assertCanRead(request);

      const { conversationId } = stored.pointer;
      const pending = await findPendingFpCloseProposal({
        service: proposals.getProposalsService(),
        conversationId,
        spaceId,
        request,
      });
      if (!pending || pending.alertIds.length >= MAX_FP_CLOSE_ALERT_IDS) {
        return NOT_FOUND;
      }

      return {
        output: {
          found: true,
          conversation_id: conversationId,
          proposal_id: pending.proposalId,
          alert_count: pending.alertIds.length,
        },
      };
    },
  });
