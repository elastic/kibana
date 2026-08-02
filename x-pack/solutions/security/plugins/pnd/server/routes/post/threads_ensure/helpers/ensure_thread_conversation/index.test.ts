/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  deriveConversationIds,
  getGateDefinitionByGateId,
  PND_GATE_IDS,
  type PndGateDefinition,
  type PndProposalRow,
} from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { getAgentBuilderConversation } from '../../../../helpers/get_agent_builder_conversation';
import { PND_THREAD_ATTACHMENT_IDS } from '../build_thread_attachments';
import { createPndConversation } from '../create_pnd_conversation';
import { createThreadAttachments } from '../create_thread_attachments';
import { findPndProposalRow } from '../find_pnd_proposal_row';
import { ensureThreadConversation } from '.';

jest.mock('../../../../helpers/get_agent_builder_conversation');
jest.mock('../create_pnd_conversation');
jest.mock('../create_thread_attachments');
jest.mock('../find_pnd_proposal_row');

const getAgentBuilderConversationMock = getAgentBuilderConversation as jest.Mock;
const createPndConversationMock = createPndConversation as jest.Mock;
const createThreadAttachmentsMock = createThreadAttachments as jest.Mock;
const findPndProposalRowMock = findPndProposalRow as jest.Mock;

const investigationAttachmentCall = () =>
  createThreadAttachmentsMock.mock.calls
    .map(([args]) => args)
    .find(({ conversationId }) => conversationId === INVESTIGATION_ID);

const gateFor = (gateId: string): PndGateDefinition => {
  const gate = getGateDefinitionByGateId(gateId);
  if (gate == null) {
    throw new Error(`no gate registered for "${gateId}"`);
  }
  return gate;
};

const THREAD_ID = 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001';
const { investigationConversationId: INVESTIGATION_ID } = deriveConversationIds('ad-1');

const logger = loggerMock.create();

const createParams = (overrides: Record<string, unknown> = {}) => ({
  agentBuilder: { id: 'agentBuilder' } as unknown as AgentBuilderPluginStart,
  correlationId: 'ad-1',
  attackDiscoveryMarkdown: '## Attack Discovery',
  attackDiscoveryTitle: 'Coordinated credential theft',
  ensurePndAgents: jest.fn().mockResolvedValue(true),
  gate: gateFor(PND_GATE_IDS.applyTuning),
  http: { id: 'http' } as unknown as HttpServiceStart,
  logger,
  managementClient: { id: 'managementClient' } as unknown as WatchWorkflowsManagementClient,
  request: {} as KibanaRequest,
  spaceId: 'agent-1',
  threadConversationId: THREAD_ID,
  ...overrides,
});

const proposal = (): PndProposalRow => ({
  alwaysGate: true,
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:05:00.000Z',
  gateId: PND_GATE_IDS.applyTuning,
  inputSchema: {},
  message: 'Apply a tuning?',
  reasoning: 'Two false positives in seven days.',
  recommendedAction: 'tune',
  reversible: false,
  sourceId: 'source-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_apply_tuning',
  title: 'Tune Endpoint Security',
  workflowId: 'security.watch.detection',
  workflowRunId: 'run-1',
});

describe('ensureThreadConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAgentBuilderConversationMock.mockResolvedValue({
      conversation: undefined,
      exists: false,
      status: 404,
    });
    createPndConversationMock.mockResolvedValue({ status: 200 });
    createThreadAttachmentsMock.mockResolvedValue({ missing: [], present: ['a', 'b', 'c'] });
    findPndProposalRowMock.mockResolvedValue(proposal());
  });

  describe('when the thread does not exist yet', () => {
    it('reports that it created the thread', async () => {
      expect(await ensureThreadConversation(createParams())).toEqual({
        missingAttachments: [],
        outcome: 'created',
      });
    });

    it('creates at the derived thread id', async () => {
      await ensureThreadConversation(createParams());

      expect(createPndConversationMock).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: THREAD_ID })
      );
    });

    it('names the tuning agent for the apply_tuning gate (threadAgentKind, not parentKind)', async () => {
      await ensureThreadConversation(createParams());

      expect(createPndConversationMock).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'pnd.detection_tuning' })
      );
    });

    it('names the investigation agent for the open_investigation gate', async () => {
      await ensureThreadConversation(
        createParams({ gate: gateFor(PND_GATE_IDS.openInvestigation) })
      );

      expect(createPndConversationMock).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'pnd.investigation' })
      );
    });

    it('omits the agent id when the install did not report success (ADR-011)', async () => {
      await ensureThreadConversation(
        createParams({ ensurePndAgents: jest.fn().mockResolvedValue(false) })
      );

      expect(createPndConversationMock).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: undefined })
      );
    });

    it('titles the conversation from the attack discovery and the gate, with no LLM turn', async () => {
      await ensureThreadConversation(createParams());

      expect(createPndConversationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Decision on applying a detection rule change: Coordinated credential theft',
        })
      );
    });

    it('creates the three attachments after the conversation exists', async () => {
      await ensureThreadConversation(createParams());

      expect(createThreadAttachmentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: THREAD_ID })
      );
      expect(createThreadAttachmentsMock.mock.calls[0][0].attachments).toHaveLength(3);
    });

    it('attaches the Attack Discovery to the investigation container', async () => {
      await ensureThreadConversation(
        createParams({ gate: gateFor(PND_GATE_IDS.openInvestigation) })
      );

      expect(createThreadAttachmentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: INVESTIGATION_ID })
      );
    });

    it('attaches only the Attack Discovery artifact to the investigation container', async () => {
      await ensureThreadConversation(
        createParams({ gate: gateFor(PND_GATE_IDS.openInvestigation) })
      );

      expect(
        investigationAttachmentCall()?.attachments.map(({ id }: { id: string }) => id)
      ).toEqual([PND_THREAD_ATTACHMENT_IDS.attackDiscovery]);
    });

    it('carries the Attack Discovery markdown onto the investigation container', async () => {
      await ensureThreadConversation(
        createParams({ gate: gateFor(PND_GATE_IDS.openInvestigation) })
      );

      expect(investigationAttachmentCall()?.attachments[0].data.content).toEqual(
        '## Attack Discovery'
      );
    });

    it('still reports the thread created when the investigation attachment misses', async () => {
      createThreadAttachmentsMock.mockImplementation(
        async ({ conversationId }: { conversationId: string }) =>
          conversationId === INVESTIGATION_ID
            ? { missing: [PND_THREAD_ATTACHMENT_IDS.attackDiscovery], present: [] }
            : {
                missing: [],
                present: [
                  PND_THREAD_ATTACHMENT_IDS.attackDiscovery,
                  PND_THREAD_ATTACHMENT_IDS.proposedChange,
                  PND_THREAD_ATTACHMENT_IDS.backtestComparison,
                ],
              }
      );

      expect(
        await ensureThreadConversation(
          createParams({ gate: gateFor(PND_GATE_IDS.openInvestigation) })
        )
      ).toEqual({
        missingAttachments: [],
        outcome: 'created',
      });
    });

    it('logs the materialisation, naming the alert, the gate and the space', async () => {
      await ensureThreadConversation(createParams());

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ad-1'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(PND_GATE_IDS.applyTuning));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('agent-1'));
    });

    it('reports, and logs, attachments that did not land', async () => {
      createThreadAttachmentsMock.mockResolvedValue({
        missing: ['pnd-backtest-comparison'],
        present: ['pnd-attack-discovery', 'pnd-proposed-change'],
      });

      expect(await ensureThreadConversation(createParams())).toEqual({
        missingAttachments: ['pnd-backtest-comparison'],
        outcome: 'created',
      });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1 of its 3 attachments'));
    });
  });

  describe('idempotency (D6)', () => {
    it('short-circuits on the pre-read when the thread already exists', async () => {
      getAgentBuilderConversationMock.mockResolvedValue({
        conversation: { id: THREAD_ID },
        exists: true,
        status: 200,
      });

      expect(await ensureThreadConversation(createParams())).toEqual({ outcome: 'existed' });
    });

    it('spends no create hop and creates no attachment when the thread already exists', async () => {
      getAgentBuilderConversationMock.mockResolvedValue({
        conversation: { id: THREAD_ID },
        exists: true,
        status: 200,
      });

      await ensureThreadConversation(createParams());

      expect(createPndConversationMock).not.toHaveBeenCalled();
      expect(createThreadAttachmentsMock).not.toHaveBeenCalled();
    });

    it('does not even look the proposal row up when the thread already exists', async () => {
      getAgentBuilderConversationMock.mockResolvedValue({
        conversation: { id: THREAD_ID },
        exists: true,
        status: 200,
      });

      await ensureThreadConversation(createParams());

      expect(findPndProposalRowMock).not.toHaveBeenCalled();
    });

    it('treats a 409 as a concurrent create rather than a failure', async () => {
      createPndConversationMock.mockResolvedValue({ status: 409 });

      expect(await ensureThreadConversation(createParams())).toEqual({ outcome: 'existed' });
    });

    it('creates no second attachment set when the create answers 409', async () => {
      createPndConversationMock.mockResolvedValue({ status: 409 });

      await ensureThreadConversation(createParams());

      expect(createThreadAttachmentsMock).not.toHaveBeenCalled();
    });

    it('re-reads after a failed create and reports a concurrent create as existing', async () => {
      createPndConversationMock.mockResolvedValue({ status: 500 });
      getAgentBuilderConversationMock
        .mockResolvedValueOnce({ conversation: undefined, exists: false, status: 404 })
        .mockResolvedValueOnce({ conversation: { id: THREAD_ID }, exists: true, status: 200 });

      expect(await ensureThreadConversation(createParams())).toEqual({ outcome: 'existed' });
      expect(getAgentBuilderConversationMock).toHaveBeenCalledTimes(2);
    });

    it('creates no second attachment set when the post-failure re-read wins', async () => {
      createPndConversationMock.mockResolvedValue({ status: 500 });
      getAgentBuilderConversationMock
        .mockResolvedValueOnce({ conversation: undefined, exists: false, status: 404 })
        .mockResolvedValueOnce({ conversation: { id: THREAD_ID }, exists: true, status: 200 });

      await ensureThreadConversation(createParams());

      expect(createThreadAttachmentsMock).not.toHaveBeenCalled();
    });
  });

  describe('failure paths', () => {
    it('reports the Agent Builder status when the thread still does not exist', async () => {
      createPndConversationMock.mockResolvedValue({ status: 403 });

      expect(await ensureThreadConversation(createParams())).toEqual({
        outcome: 'failed',
        status: 403,
      });
    });

    it('never reports a failure silently — a workflow step would lose it (finding R4)', async () => {
      createPndConversationMock.mockResolvedValue({ status: 500 });

      await ensureThreadConversation(createParams());

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(THREAD_ID));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ad-1'));
    });
  });

  describe('degraded inputs', () => {
    it('still materialises the thread when the gate has not parked yet', async () => {
      findPndProposalRowMock.mockResolvedValue(undefined);

      expect(await ensureThreadConversation(createParams())).toEqual({
        missingAttachments: [],
        outcome: 'created',
      });
    });

    it('still materialises the thread when the Workflows management API is unavailable', async () => {
      await ensureThreadConversation(createParams({ managementClient: undefined }));

      expect(findPndProposalRowMock).not.toHaveBeenCalled();
      expect(createPndConversationMock).toHaveBeenCalled();
    });

    it('still materialises the thread when the proposal-row read throws, and says so', async () => {
      findPndProposalRowMock.mockRejectedValue(new Error('workflows unavailable'));

      expect(await ensureThreadConversation(createParams())).toEqual({
        missingAttachments: [],
        outcome: 'created',
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('workflows unavailable'));
    });
  });
});
