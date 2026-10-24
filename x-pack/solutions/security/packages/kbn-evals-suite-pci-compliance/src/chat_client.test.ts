/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { PciEvalChatClient } from './chat_client';

// F9 (harness-bug, run bk-01a14b73): the field-mapping round ended on an *unanswered* tool
// confirmation — `response.message` was empty and `response.prompts` carried
// `tools.platform.streams.update_stream.confirmation.call_36975` — so the round had no
// user-facing answer, yet the judge still scored the transcript 0.909 from the echoed question.
// The client must answer the pending confirmation and continue the round, and a round that still
// ends on a prompt must be reported as unanswered rather than as an answer.
//
// The marker below is the exported `UNANSWERED_PROMPT_MARKER` in chat_client.ts; it is spelled
// out here so this file also compiles against the pre-fix module.
const UNANSWERED_PROMPT_MARKER = '[UNANSWERED_PROMPT]';

// Answers a paused round take one extra converse call per prompt turn; the client caps them so a
// re-prompting agent cannot loop forever.
const MAX_PROMPT_TURNS = 3;

const confirmationId = (callNumber: number) =>
  `tools.platform.streams.update_stream.confirmation.call_${callNumber}`;

const confirmationPrompt = (id = confirmationId(36975)): PromptRequest => ({
  type: AgentPromptType.confirmation,
  id,
  title: 'Update stream logs-i4y5eq-custom',
  message: 'Mapping the non-ECS fields ...',
  confirm_text: 'Apply changes',
});

const askUserQuestionPrompt = (): PromptRequest => ({
  type: AgentPromptType.ask_user_question,
  id: 'ask.which_index',
  questions: [
    {
      question: 'Which index should I map?',
      options: [{ label: 'logs-pci-custom-eval' }],
      multi_select: false,
    },
  ],
});

const authorizationPrompt = (): PromptRequest => ({
  type: AgentPromptType.authorization,
  id: 'auth.google_drive',
  connector_id: 'connector-42',
  connector_name: 'Google Drive',
  connector_type: '.google-drive',
  auth_method: 'oauth_authorization_code',
});

interface ScriptedRound {
  message: string;
  prompts?: PromptRequest[];
}

type Script = ScriptedRound[] | ((callNumber: number) => ScriptedRound);

const buildClient = (script: Script) => {
  const calls: Array<Record<string, unknown>> = [];
  let callNumber = 0;

  const fetch = jest.fn(async (_path: string, options: { body: string }) => {
    calls.push(JSON.parse(options.body));
    callNumber += 1;

    // A script array is exhausted rather than repeated: the last round is replayed for any extra
    // call, which is what a re-prompting agent looks like.
    const scripted =
      typeof script === 'function'
        ? script(callNumber)
        : script[Math.min(callNumber - 1, script.length - 1)];

    return {
      conversation_id: 'conv-1',
      trace_id: 'trace-1',
      round_id: 'round-1',
      status: scripted.prompts?.length ? 'awaiting_prompt' : 'completed',
      steps: [{ type: 'tool_call', tool_call_id: `call-${callNumber}` }],
      response: { message: scripted.message, prompts: scripted.prompts },
    };
  }) as unknown as HttpHandler;

  const log = {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog;

  return { client: new PciEvalChatClient(fetch, log, 'test-connector'), fetch, log, calls };
};

describe('PciEvalChatClient.converse', () => {
  it('answers the pending confirmation and returns the follow-up answer, not the empty message', async () => {
    const { client, calls } = buildClient([
      { message: '', prompts: [confirmationPrompt()] },
      { message: 'Mapped 4 fields: username → user.name, src_ip → source.ip.' },
    ]);

    const result = await client.converse({ message: 'Map the non-ECS fields.' });

    expect(calls).toHaveLength(2);
    // First call: the user question, no prompt responses.
    expect(calls[0]).toMatchObject({ input: 'Map the non-ECS fields.' });
    expect(calls[0].prompts).toBeUndefined();
    // Second call: the confirmation is answered, and the message is not repeated.
    expect(calls[1].prompts).toEqual({
      'tools.platform.streams.update_stream.confirmation.call_36975': { allow: true },
    });
    expect(calls[1].input).toBeUndefined();
    expect(calls[1].conversation_id).toBe('conv-1');

    expect(result.unansweredPrompt).toBe(false);
    expect(result.promptTurns).toBe(1);
    expect(result.messages[1].message).toBe(
      'Mapped 4 fields: username → user.name, src_ip → source.ip.'
    );
  });

  it('keeps the steps of both turns on one round', async () => {
    const { client } = buildClient([
      { message: '', prompts: [confirmationPrompt()] },
      { message: 'Applied.' },
    ]);

    const result = await client.converse({ message: 'Map the non-ECS fields.' });

    expect(result.steps).toEqual([
      { type: 'tool_call', tool_call_id: 'call-1' },
      { type: 'tool_call', tool_call_id: 'call-2' },
    ]);
  });

  it('stops at the prompt-turn cap when the agent keeps raising new confirmations', async () => {
    // A fresh confirmation id each turn: the client answers up to the cap and then stops.
    const { client, calls } = buildClient((callNumber) => ({
      message: '',
      prompts: [confirmationPrompt(confirmationId(callNumber))],
    }));

    const result = await client.converse({ message: 'Map the non-ECS fields.' });

    expect(calls).toHaveLength(1 + MAX_PROMPT_TURNS);
    expect(result.unansweredPrompt).toBe(true);
    expect(result.promptTurns).toBe(MAX_PROMPT_TURNS);
    expect(result.messages[1].message).toContain(UNANSWERED_PROMPT_MARKER);
    expect(result.prompts).toEqual([confirmationPrompt(confirmationId(1 + MAX_PROMPT_TURNS))]);
  });

  it('stops as soon as the same prompt comes back instead of answering it again', async () => {
    // Same confirmation id every time: answering it a second time cannot change the outcome, so
    // the round is reported as paused after a single answer turn rather than looping.
    const { client, calls } = buildClient([
      { message: '', prompts: [confirmationPrompt()] },
      { message: '', prompts: [confirmationPrompt()] },
    ]);

    const result = await client.converse({ message: 'Map the non-ECS fields.' });

    expect(calls).toHaveLength(2);
    expect(result.unansweredPrompt).toBe(true);
    expect(result.promptTurns).toBe(1);
    expect(result.messages[1].message).toContain(UNANSWERED_PROMPT_MARKER);
  });

  it('does not auto-answer a prompt that needs a real decision (ask_user_question)', async () => {
    const { client, calls } = buildClient([
      { message: '', prompts: [askUserQuestionPrompt()] },
      { message: 'should never be reached' },
    ]);

    const result = await client.converse({ message: 'Map the non-ECS fields.' });

    expect(calls).toHaveLength(1);
    expect(result.unansweredPrompt).toBe(true);
    expect(result.promptTurns).toBe(0);
    expect(result.messages[1].message).toContain(UNANSWERED_PROMPT_MARKER);
  });

  it('does not auto-answer an authorization prompt', async () => {
    const { client, calls } = buildClient([
      { message: '', prompts: [authorizationPrompt()] },
      { message: 'should never be reached' },
    ]);

    const result = await client.converse({ message: 'Map the non-ECS fields.' });

    expect(calls).toHaveLength(1);
    expect(result.unansweredPrompt).toBe(true);
  });

  it('leaves a round that never pauses untouched', async () => {
    const { client, calls } = buildClient([
      { message: 'Requirement 8.3.4 is RED: 12 failed logins for jdoe.' },
    ]);

    const result = await client.converse({ message: 'Run the brute-force check.' });

    expect(calls).toHaveLength(1);
    expect(result.promptTurns).toBe(0);
    expect(result.unansweredPrompt).toBe(false);
    expect(result.prompts).toEqual([]);
    expect(result.messages).toEqual([
      { message: 'Run the brute-force check.' },
      { message: 'Requirement 8.3.4 is RED: 12 failed logins for jdoe.' },
    ]);
  });
});
