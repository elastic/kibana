/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { runInvestigationSummary, type InvestigationConversationReader } from './run_summary';

const request = {} as KibanaRequest;

describe('runInvestigationSummary', () => {
  const conversation = {
    template_id: 'investigation',
    events: [
      {
        type: 'user_message',
        created_at: '2026-10-06T00:00:00.000Z',
        data: { message: 'Okta rule fired for the admin.' },
      },
    ],
    attachments: [{ id: 'att-proposal', type: 'platform.proposal', origin: 'prop-0' }],
  };

  const setup = ({
    output = { summary: 'The Okta admin rule fired and was noted.' } as unknown,
    conversationOverride,
  }: { output?: unknown; conversationOverride?: Partial<typeof conversation> } = {}) => {
    const client: InvestigationConversationReader = {
      get: jest.fn(async () => ({ ...conversation, ...conversationOverride })),
      patchMetadata: jest.fn(async () => ({})),
    };
    const invoke = jest.fn(async () => output);
    const withStructuredOutput = jest.fn(() => ({ invoke }));
    const chatModel = { withStructuredOutput } as unknown as ScopedModel['chatModel'];
    const resolveChatModel = jest.fn(async () => chatModel);
    return { client, invoke, withStructuredOutput, resolveChatModel };
  };

  it('writes the summary from one structured model call', async () => {
    const { client, invoke, withStructuredOutput, resolveChatModel } = setup();

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({
      skipped: false,
      summary: 'The Okta admin rule fired and was noted.',
    });
    expect(withStructuredOutput).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      [
        ['system', expect.stringContaining('ASD-STE100')],
        ['human', 'User: Okta rule fired for the admin.'],
      ],
      expect.anything()
    );
    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { summary: 'The Okta admin rule fired and was noted.' },
      { access: 'converse' }
    );
  });

  it('does not call the model for a conversation that is not an investigation or escalation', async () => {
    const { client, invoke, resolveChatModel } = setup({
      conversationOverride: { template_id: 'chat' },
    });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({ skipped: true, reason: 'template' });
    expect(invoke).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('does not summarize an investigation that has no proposal', async () => {
    const { client, invoke, resolveChatModel } = setup({
      conversationOverride: { attachments: [] },
    });
    const getProposals = jest.fn(async () => ({}));

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel, getProposals },
    });

    expect(result).toEqual({ skipped: true, reason: 'no_proposal' });
    expect(resolveChatModel).not.toHaveBeenCalled();
    expect(getProposals).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('does not count a hidden proposal as a proposal', async () => {
    const { client, invoke, resolveChatModel } = setup({
      conversationOverride: {
        attachments: [
          { id: 'att-proposal', type: 'platform.proposal', origin: 'prop-0', hidden: true },
        ] as never,
      },
    });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({ skipped: true, reason: 'no_proposal' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('always summarizes an escalation, with or without a proposal', async () => {
    const { client, invoke, resolveChatModel } = setup({
      conversationOverride: { template_id: 'escalation', attachments: [] },
    });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result.skipped).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('does not call the model when the timeline has no story', async () => {
    const { client, invoke, resolveChatModel } = setup({ conversationOverride: { events: [] } });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({ skipped: true, reason: 'empty' });
    expect(resolveChatModel).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('skips when no connector is available', async () => {
    const { client, invoke } = setup();

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel: async () => undefined },
    });

    expect(result).toEqual({ skipped: true, reason: 'no_connector' });
    expect(invoke).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('passes the cancellation signal to the model call', async () => {
    const { client, invoke, resolveChatModel } = setup();
    const { signal } = new AbortController();

    await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      abortSignal: signal,
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(invoke).toHaveBeenCalledWith(expect.anything(), { signal });
  });

  it('does not call the model for a run that was already cancelled', async () => {
    const { client, invoke, resolveChatModel } = setup();
    const controller = new AbortController();
    controller.abort();

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      abortSignal: controller.signal,
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({ skipped: true, reason: 'cancelled' });
    expect(invoke).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('does not write the summary of a run that was cancelled during the model call', async () => {
    const { client, invoke, resolveChatModel } = setup();
    const controller = new AbortController();
    invoke.mockImplementationOnce(async () => {
      controller.abort();
      return { summary: 'A summary of the older timeline.' };
    });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      abortSignal: controller.signal,
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({ skipped: true, reason: 'cancelled' });
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('does not log a failure when the model call rejects because the run was cancelled', async () => {
    const { client, invoke, resolveChatModel } = setup();
    const controller = new AbortController();
    const logger = { warn: jest.fn() } as unknown as Logger;
    invoke.mockImplementationOnce(async () => {
      controller.abort();
      throw new Error('Aborted');
    });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      abortSignal: controller.signal,
      deps: { getConversationClient: async () => client, resolveChatModel, logger },
    });

    expect(result).toEqual({ skipped: true, reason: 'cancelled' });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('writes nothing when the model returns no summary', async () => {
    const { client, resolveChatModel } = setup({ output: { summary: '   ' } });

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(result).toEqual({ skipped: true, reason: 'incomplete' });
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('writes nothing when the model call fails', async () => {
    const { client, invoke, resolveChatModel } = setup();
    invoke.mockRejectedValueOnce(new Error('No tool calls found in the response.'));
    const logger = { warn: jest.fn() } as unknown as Logger;

    const result = await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel, logger },
    });

    expect(result).toEqual({ skipped: true, reason: 'incomplete' });
    expect(client.patchMetadata).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No tool calls found'));
  });

  it('tells the model to wrap entity and process names in backticks', async () => {
    const { client, invoke, resolveChatModel } = setup();

    await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(invoke).toHaveBeenCalledWith(
      [['system', expect.stringContaining('in single backticks')], expect.anything()],
      expect.anything()
    );
  });

  it('tells the model not to call a proposal pending', async () => {
    const { client, invoke, resolveChatModel } = setup();

    await runInvestigationSummary({
      request,
      spaceId: 'default',
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, resolveChatModel },
    });

    expect(invoke).toHaveBeenCalledWith(
      [
        [
          'system',
          expect.stringMatching(
            /Never say that a proposal is pending[\s\S]*stay true whichever way/
          ),
        ],
        expect.anything(),
      ],
      expect.anything()
    );
  });

  describe('proposal attachments', () => {
    const proposalConversation = {
      events: [
        {
          type: 'attachment_added',
          created_at: '2026-10-06T00:00:00.000Z',
          data: { attachment_id: 'att-1', attachment_type: 'platform.proposal' },
        },
      ],
      attachments: [
        {
          id: 'att-1',
          type: 'platform.proposal',
          origin: 'prop-1',
          current_version: 1,
          versions: [{ version: 1, data: { proposalId: 'prop-1', title: 'Review detection gap' } }],
        },
      ],
    };

    it('puts the proposal content into the story', async () => {
      const { client, invoke, resolveChatModel } = setup({
        conversationOverride: proposalConversation as never,
      });
      const getProposals = jest.fn(async () => ({
        'prop-1': {
          title: 'Review detection gap',
          status: 'pending',
          comment: 'No rule covers payroll account changes.',
        },
      }));

      await runInvestigationSummary({
        request,
        spaceId: 'space-a',
        conversationId: 'conv-1',
        deps: { getConversationClient: async () => client, resolveChatModel, getProposals },
      });

      expect(getProposals).toHaveBeenCalledWith(['prop-1'], 'space-a', request);
      expect(invoke).toHaveBeenCalledWith(
        [
          expect.anything(),
          ['human', 'Proposal: Review detection gap\nNo rule covers payroll account changes.'],
        ],
        expect.anything()
      );
    });

    it('falls back to the attachment label when the proposal cannot be read', async () => {
      const { client, invoke, resolveChatModel } = setup({
        conversationOverride: proposalConversation as never,
      });
      const getProposals = jest.fn(async () => ({}));

      const result = await runInvestigationSummary({
        request,
        spaceId: 'default',
        conversationId: 'conv-1',
        deps: { getConversationClient: async () => client, resolveChatModel, getProposals },
      });

      expect(result.skipped).toBe(false);
      expect(invoke).toHaveBeenCalledWith(
        [
          expect.anything(),
          ['human', 'Attachment added (platform.proposal): Review detection gap'],
        ],
        expect.anything()
      );
    });
    it('reads only the proposals an attachment event added', async () => {
      const { client, resolveChatModel } = setup({
        conversationOverride: {
          ...proposalConversation,
          attachments: [
            ...proposalConversation.attachments,
            {
              id: 'att-2',
              type: 'platform.proposal',
              origin: 'prop-2',
              current_version: 1,
              versions: [{ version: 1, data: { proposalId: 'prop-2', title: 'Other' } }],
            },
          ],
        } as never,
      });
      const getProposals = jest.fn(async () => ({}));

      await runInvestigationSummary({
        request,
        spaceId: 'default',
        conversationId: 'conv-1',
        deps: { getConversationClient: async () => client, resolveChatModel, getProposals },
      });

      expect(getProposals).toHaveBeenCalledWith(['prop-1'], 'default', request);
    });

    it('does not read proposals when the timeline has none', async () => {
      const { client, resolveChatModel } = setup();
      const getProposals = jest.fn(async () => ({}));

      await runInvestigationSummary({
        request,
        spaceId: 'default',
        conversationId: 'conv-1',
        deps: { getConversationClient: async () => client, resolveChatModel, getProposals },
      });

      expect(getProposals).not.toHaveBeenCalled();
    });

    it('caps how many proposals it reads, keeping the newest', async () => {
      const ids = Array.from({ length: 25 }, (_, index) => index);
      const { client, resolveChatModel } = setup({
        conversationOverride: {
          events: ids.map((index) => ({
            type: 'attachment_added',
            created_at: `2026-10-06T00:00:${String(index).padStart(2, '0')}.000Z`,
            data: { attachment_id: `att-${index}`, attachment_type: 'platform.proposal' },
          })),
          attachments: ids.map((index) => ({
            id: `att-${index}`,
            type: 'platform.proposal',
            origin: `prop-${index}`,
          })),
        } as never,
      });
      const getProposals = jest.fn(async () => ({}));

      await runInvestigationSummary({
        request,
        spaceId: 'default',
        conversationId: 'conv-1',
        deps: { getConversationClient: async () => client, resolveChatModel, getProposals },
      });

      expect(getProposals).toHaveBeenCalledWith(
        ids.slice(-20).map((index) => `prop-${index}`),
        'default',
        request
      );
    });
  });
});
