/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  BoundInferenceClient,
  ChatCompleteOptions,
  ChatCompletionEvent,
  ToolCallArguments,
  ToolMessage,
} from '@kbn/inference-common';
import {
  ChatCompletionErrorCode,
  ChatCompletionEventType,
  createInferenceProviderError,
  InferenceTaskError,
  MessageRole,
} from '@kbn/inference-common';
import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import { buildValidBrief, FIXTURE_EVIDENCE } from '../verification/__fixtures__/evidence';
import { composeVerifiedBrief } from './compose_verified_brief';
import { REPAIR_INSTRUCTIONS } from './repair';
import { BriefCompositionError } from './types';

const DEFAULT_TOKENS = { prompt: 1000, completion: 200, total: 1200 };

const tokenEvent = (tokens = DEFAULT_TOKENS): ChatCompletionEvent => ({
  type: ChatCompletionEventType.ChatCompletionTokenCount,
  tokens,
  model: 'test-model',
});

const messageEvent = (args?: ToolCallArguments): ChatCompletionEvent => ({
  type: ChatCompletionEventType.ChatCompletionMessage,
  content: args === undefined ? 'Here is the brief' : '',
  toolCalls:
    args === undefined
      ? []
      : [{ toolCallId: 'call-1', function: { name: 'submit_brief', arguments: args } }],
});

/** A streamed response: usage, then the message with the submit_brief call. */
const submitted = (
  args: ToolCallArguments,
  tokens = DEFAULT_TOKENS
): Observable<ChatCompletionEvent> => of(tokenEvent(tokens), messageEvent(args));

const toolValidationError = () =>
  new InferenceTaskError(ChatCompletionErrorCode.ToolValidationError, 'invalid', {
    arguments: JSON.stringify({ verdict: {} }),
    errorsText: 'verdict.level: required',
    toolCalls: [
      { toolCallId: 'call-0', function: { name: 'submit_brief', arguments: '{"verdict":{}}' } },
    ],
  });

type Response = Observable<ChatCompletionEvent> | (() => Observable<ChatCompletionEvent>);

const setup = (...responses: Response[]) => {
  const chatComplete = jest.fn();
  responses.forEach((response) =>
    chatComplete.mockImplementationOnce(typeof response === 'function' ? response : () => response)
  );
  const inferenceClient = { chatComplete } as unknown as BoundInferenceClient;
  const onStage = jest.fn().mockResolvedValue(undefined);
  const logger = loggingSystemMock.createLogger();
  const run = (abortSignal = new AbortController().signal) =>
    composeVerifiedBrief({
      inferenceClient,
      evidence: FIXTURE_EVIDENCE,
      timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z', range: '7d' },
      abortSignal,
      logger,
      onStage,
    });
  const request = (call: number): ChatCompleteOptions => chatComplete.mock.calls[call][0];
  return { chatComplete, onStage, logger, run, request };
};

const withVerdictLevel = (level: Brief['verdict']['level']): Brief => ({
  ...buildValidBrief(),
  verdict: { ...buildValidBrief().verdict, level },
  areas: [],
});

describe('composeVerifiedBrief', () => {
  it('composes and verifies a brief in one streamed call', async () => {
    const { chatComplete, onStage, run, request } = setup(submitted(buildValidBrief()));
    const result = await run();

    expect(result).toEqual({
      brief: buildValidBrief(),
      verification: { dropped: {}, lowered: 0, repaired: false },
      model: 'test-model',
      tokens: DEFAULT_TOKENS,
    });
    expect(onStage.mock.calls).toEqual([['compose'], ['verify']]);
    expect(chatComplete).toHaveBeenCalledTimes(1);

    const { stream, toolChoice, tools, messages, retryConfiguration } = request(0);
    expect(stream).toBe(true);
    expect(toolChoice).toEqual({ function: 'submit_brief' });
    expect(Object.keys(tools ?? {})).toEqual(['submit_brief']);
    expect(messages).toEqual([
      expect.objectContaining({ content: expect.stringContaining('<evidence>') }),
    ]);
    expect(JSON.stringify(messages)).not.toContain('a.rodriguez');

    const retryOn = retryConfiguration?.retryOn as (error: Error) => boolean;
    expect(retryOn(toolValidationError())).toBe(false);
    expect(retryOn(createInferenceProviderError('overloaded', { status: 529 }))).toBe(true);
    expect(retryOn(createInferenceProviderError('bad request', { status: 400 }))).toBe(false);
  });

  it('trims over-long prose and lists instead of repairing', async () => {
    const brief = buildValidBrief();
    const output = {
      ...brief,
      verdict: {
        ...brief.verdict,
        headline: `${'A privileged account reached production '.repeat(8)}hosts`,
        evidence: [...brief.verdict.evidence, ...Array.from({ length: 30 }, () => 'F-1')],
      },
      areas: [brief.areas[0], brief.areas[0], brief.areas[1]],
    };
    const { chatComplete, run, request } = setup(submitted(output));
    const result = await run();

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(result.verification.repaired).toBe(false);
    expect(result.brief.verdict.headline.length).toBeLessThanOrEqual(160);
    expect(result.brief.verdict.headline.endsWith('…')).toBe(true);
    expect(result.brief.areas.map(({ id }) => id)).toEqual(['threats', 'response']);
    // The plugin must not reject length overshoots before the server can trim them.
    expect(JSON.stringify(request(0).tools)).not.toMatch(/maxLength|maxItems/);
  });

  it('repairs a structural failure once, showing composing again, and sums tokens', async () => {
    const { chatComplete, onStage, run, request } = setup(
      submitted(withVerdictLevel('clear')),
      submitted(buildValidBrief(), { prompt: 1500, completion: 250, total: 1750 })
    );
    const result = await run();

    expect(result.verification.repaired).toBe(true);
    expect(result.brief.verdict.level).toBe('urgent');
    expect(result.tokens).toEqual({ prompt: 2500, completion: 450, total: 2950 });
    expect(onStage.mock.calls).toEqual([['compose'], ['verify'], ['compose'], ['verify']]);
    expect(chatComplete).toHaveBeenCalledTimes(2);

    const [, assistant, tool] = request(1).messages;
    expect(assistant).toEqual(
      expect.objectContaining({
        role: MessageRole.Assistant,
        toolCalls: [expect.objectContaining({ toolCallId: 'call-1' })],
      })
    );
    expect(tool).toEqual(
      expect.objectContaining({
        role: MessageRole.Tool,
        toolCallId: 'call-1',
        name: 'submit_brief',
      })
    );
    expect((tool as ToolMessage).response).toEqual(
      expect.objectContaining({
        instructions: REPAIR_INSTRUCTIONS,
        problems: [expect.stringContaining('cannot be "clear"')],
      })
    );
  });

  it('repairs after a tool validation error and keeps that call’s usage', async () => {
    const { request, run } = setup(
      concat(of(tokenEvent()), throwError(toolValidationError)),
      submitted(buildValidBrief())
    );
    const result = await run();

    expect(result.verification.repaired).toBe(true);
    expect(result.tokens).toEqual({ prompt: 2000, completion: 400, total: 2400 });
    expect(request(1).messages[2]).toEqual(expect.objectContaining({ toolCallId: 'call-0' }));
  });

  it('asks for a tool call with a user message when none was made', async () => {
    const { request, run } = setup(of(tokenEvent(), messageEvent()), submitted(buildValidBrief()));
    await run();
    expect(request(1).messages[1]).toEqual(
      expect.objectContaining({
        role: MessageRole.User,
        content: expect.stringContaining('No submit_brief tool call was made'),
      })
    );
  });

  it('fails with llm_output when the repaired brief still fails', async () => {
    const { chatComplete, run } = setup(
      submitted(withVerdictLevel('clear')),
      submitted({ verdict: { level: 'meh' } })
    );
    const error = await run().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BriefCompositionError);
    expect(error).toEqual(
      expect.objectContaining({
        code: 'llm_output',
        message: expect.stringContaining('failed verification after one repair'),
      })
    );
    expect(chatComplete).toHaveBeenCalledTimes(2);
  });

  it('maps connector errors to llm_error', async () => {
    const { run } = setup(throwError(() => new Error('connector unreachable')));
    await expect(run()).rejects.toEqual(
      expect.objectContaining({
        code: 'llm_error',
        message: expect.stringContaining('unreachable'),
      })
    );
  });

  it('honours the abort signal before the first call and before a repair', async () => {
    const aborted = new AbortController();
    aborted.abort();
    const before = setup(submitted(buildValidBrief()));
    await expect(before.run(aborted.signal)).rejects.toEqual(
      expect.objectContaining({ code: 'llm_error', message: expect.stringContaining('aborted') })
    );
    expect(before.chatComplete).not.toHaveBeenCalled();

    const controller = new AbortController();
    const during = setup(() => {
      controller.abort();
      return submitted(withVerdictLevel('clear'));
    });
    await expect(during.run(controller.signal)).rejects.toEqual(
      expect.objectContaining({ code: 'llm_error', message: expect.stringContaining('aborted') })
    );
    expect(during.chatComplete).toHaveBeenCalledTimes(1);
  });

  it('drops item-level problems without a repair', async () => {
    const brief = buildValidBrief();
    brief.areas[1].summary = 'There were 999 alerts.';
    const { chatComplete, run } = setup(submitted(brief));
    const result = await run();

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(result.brief.areas.map(({ id }) => id)).toEqual(['threats']);
    expect(result.verification).toEqual({ dropped: { number: 1 }, lowered: 0, repaired: false });
  });

  it('logs when the plugin reports no usage', async () => {
    const { logger, run } = setup(of(messageEvent(buildValidBrief())));
    const result = await run();

    expect(result.tokens).toEqual({ prompt: 0, completion: 0, total: 0 });
    expect(result).not.toHaveProperty('model');
    expect(logger.debug).toHaveBeenCalledWith(
      'Executive brief: the inference plugin reported no token usage or model for the compose call'
    );
  });
});
