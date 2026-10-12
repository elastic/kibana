/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode, ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import type { ExecuteAgentParams, ExecuteAgentResult } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import { of } from 'rxjs';
import { INVESTIGATION_DESCRIPTION_MAX_LENGTH } from '@kbn/alertzero-common';
import { runInvestigationSummary, type InvestigationConversationReader } from './run_summary';

const request = {} as KibanaRequest;

const completed = (summary: string, description?: string) =>
  of({
    type: ChatEventType.messageComplete,
    data: {
      message_id: 'm-1',
      message_content: summary,
      structured_output: { summary, ...(description !== undefined ? { description } : {}) },
    },
  } as ChatEvent);

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
    attachments: [],
  };

  const setup = (overrides?: Partial<InvestigationConversationReader>) => {
    const client: InvestigationConversationReader = {
      get: jest.fn(async () => conversation),
      patchMetadata: jest.fn(async () => ({})),
      ...overrides,
    };
    const executeAgent = jest.fn(
      async (_params: ExecuteAgentParams): Promise<ExecuteAgentResult> => ({
        events$: completed(
          'The Okta admin rule fired and was noted.',
          'Okta admin rule fired and was noted.'
        ),
        executionId: 'exec-1',
      })
    );
    return { client, executeAgent };
  };

  it('writes the summary and the description from a standalone run', async () => {
    const { client, executeAgent } = setup();

    const result = await runInvestigationSummary({
      request,
      conversationId: 'conv-1',
      deps: {
        getConversationClient: async () => client,
        executeAgent,
      },
    });

    expect(result).toEqual({
      skipped: false,
      summary: 'The Okta admin rule fired and was noted.',
      description: 'Okta admin rule fired and was noted.',
    });
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ mode: AgentExecutionMode.standalone, useTaskManager: false })
    );
    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      {
        summary: 'The Okta admin rule fired and was noted.',
        description: 'Okta admin rule fired and was noted.',
      },
      { access: 'converse' }
    );
  });

  it('asks for a story-length summary and limits only the description', async () => {
    const { client, executeAgent } = setup();

    await runInvestigationSummary({
      request,
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, executeAgent },
    });

    const { params } = executeAgent.mock.calls[0][0] as {
      params: { nextInput: { message: string }; outputSchema: Record<string, any> };
    };
    const { message } = params.nextInput;
    expect(message).toContain('as one short paragraph of about four to eight sentences');
    expect(message).toContain('The summary is the full account and has no character limit.');
    expect(message).toContain(
      `at most ${INVESTIGATION_DESCRIPTION_MAX_LENGTH} characters, no markdown and no line breaks. The limit applies to the description only`
    );
    expect(params.outputSchema.properties.summary.maxLength).toBeUndefined();
    expect(params.outputSchema.properties.description.maxLength).toBe(
      INVESTIGATION_DESCRIPTION_MAX_LENGTH
    );
  });

  it('collapses the description to one line within the limit, cut at a word boundary', async () => {
    const { client, executeAgent } = setup();
    executeAgent.mockResolvedValue({
      events$: completed('Summary.', `Okta  admin\nrule ${'fired and was noted '.repeat(20)}`),
      executionId: 'exec-1',
    });

    await runInvestigationSummary({
      request,
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, executeAgent },
    });

    const [, updates] = (client.patchMetadata as jest.Mock).mock.calls[0];
    expect(updates.description.length).toBeLessThanOrEqual(INVESTIGATION_DESCRIPTION_MAX_LENGTH);
    expect(updates.description).not.toMatch(/\s{2}|\n/);
    expect(updates.description.endsWith('…')).toBe(true);
  });

  it('still writes the summary when the model returns no description', async () => {
    const { client, executeAgent } = setup();
    executeAgent.mockResolvedValue({ events$: completed('Summary only.'), executionId: 'exec-1' });

    await runInvestigationSummary({
      request,
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, executeAgent },
    });

    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { summary: 'Summary only.' },
      { access: 'converse' }
    );
  });

  it('does not call the model for a conversation that is not an investigation or escalation', async () => {
    const { client, executeAgent } = setup({
      get: jest.fn(async () => ({ ...conversation, template_id: 'chat' })),
    });

    const result = await runInvestigationSummary({
      request,
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, executeAgent },
    });

    expect(result).toEqual({ skipped: true, reason: 'template' });
    expect(executeAgent).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('does not call the model when the timeline has no story', async () => {
    const { client, executeAgent } = setup({
      get: jest.fn(async () => ({ ...conversation, events: [] })),
    });

    const result = await runInvestigationSummary({
      request,
      conversationId: 'conv-1',
      deps: { getConversationClient: async () => client, executeAgent },
    });

    expect(result).toEqual({ skipped: true, reason: 'empty' });
    expect(executeAgent).not.toHaveBeenCalled();
  });
});
