/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { StoredFpOpenPointer } from '../rule_dispositions/fp_open_pointer_store';

export const FAKE_REQUEST = { headers: {} };

export const createProposalsMock = () => {
  const service = {
    list: jest.fn().mockResolvedValue({ proposals: [], total: 0 }),
    getLatestRevision: jest.fn(),
    revise: jest.fn(),
  };
  const privileges = {
    assertCanRead: jest.fn().mockResolvedValue(undefined),
    assertCanManage: jest.fn().mockResolvedValue(undefined),
  };
  const getProposals = () =>
    ({
      getProposalsService: () => service,
      getProposalPrivileges: () => privileges,
    } as unknown as ProposalsPluginStart);
  return { service, privileges, getProposals };
};

export const createStepContext = (input: Record<string, unknown>) => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const context = {
    input,
    rawInput: input,
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        workflow: { spaceId: 'space-a' },
        execution: { id: 'review-exec-2' },
      }),
      getFakeRequest: jest.fn().mockReturnValue(FAKE_REQUEST),
      getScopedEsClient: jest.fn().mockReturnValue({}),
    },
    logger,
    abortSignal: new AbortController().signal,
    stepId: 'step',
    stepType: 'alertzero.step',
  } as never;
  return { context, logger };
};

export const pendingFpCloseProposal = (id: string, alertIds: string[]) => ({
  id,
  actionWorkflowId: ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID,
  actionInput: { alertIds, reason: 'false_positive' },
  status: 'pending',
  decision: undefined,
});

export const storedPointer = ({
  conversationId = 'conv-standing',
  updatedAt = '2026-01-01T00:00:00.000Z',
}: { conversationId?: string; updatedAt?: string } = {}): StoredFpOpenPointer => ({
  pointer: { ruleId: 'rule-1', conversationId, updatedAt },
  seqNo: 7,
  primaryTerm: 1,
});
