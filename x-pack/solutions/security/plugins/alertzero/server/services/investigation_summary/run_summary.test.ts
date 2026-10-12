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
import { runInvestigationSummary, type InvestigationConversationReader } from './run_summary';

const request = {} as KibanaRequest;

const completed = (summary: string) =>
  of({
    type: ChatEventType.messageComplete,
    data: {
      message_id: 'm-1',
      message_content: summary,
      structured_output: { summary },
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
        events$: completed('The Okta admin rule fired and was noted.'),
        executionId: 'exec-1',
      })
    );
    return { client, executeAgent };
  };

  it('writes the summary from a standalone run and leaves description untouched', async () => {
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
    });
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ mode: AgentExecutionMode.standalone, useTaskManager: false })
    );
    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { summary: 'The Okta admin rule fired and was noted.' },
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
