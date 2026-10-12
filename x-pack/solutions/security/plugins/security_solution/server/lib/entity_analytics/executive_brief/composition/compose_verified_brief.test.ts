/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient, ToolMessage } from '@kbn/inference-common';
import { ChatCompletionErrorCode, InferenceTaskError, MessageRole } from '@kbn/inference-common';
import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import { buildValidBrief, FIXTURE_EVIDENCE } from '../verification/__fixtures__/evidence';
import { normalizeBriefOutput } from './compose_brief';
import { composeVerifiedBrief } from './compose_verified_brief';
import { REPAIR_INSTRUCTIONS } from './repair';
import { BriefCompositionError } from './types';

const toolResponse = (args: unknown, tokens = { prompt: 1000, completion: 200, total: 1200 }) => ({
  content: '',
  toolCalls: [{ toolCallId: 'call-1', function: { name: 'submit_brief', arguments: args } }],
  tokens,
  model: 'test-model',
});

const setup = (...responses: Array<unknown | Error>) => {
  const chatComplete = jest.fn();
  responses.forEach((response) => {
    if (response instanceof Error) {
      chatComplete.mockRejectedValueOnce(response);
    } else {
      chatComplete.mockResolvedValueOnce(response);
    }
  });
  const inferenceClient = { chatComplete } as unknown as BoundInferenceClient;
  const onStage = jest.fn().mockResolvedValue(undefined);
  const run = (abortSignal = new AbortController().signal) =>
    composeVerifiedBrief({
      inferenceClient,
      evidence: FIXTURE_EVIDENCE,
      timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z', range: '7d' },
      abortSignal,
      logger: loggingSystemMock.createLogger(),
      onStage,
    });
  return { chatComplete, onStage, run };
};

const withVerdictLevel = (level: Brief['verdict']['level']): Brief => {
  const brief = buildValidBrief();
  brief.verdict.level = level;
  brief.areas = [];
  return brief;
};

describe('composeVerifiedBrief', () => {
  it('composes and verifies a brief in one call', async () => {
    const { chatComplete, onStage, run } = setup(toolResponse(buildValidBrief()));
    const result = await run();

    expect(result.brief).toEqual(buildValidBrief());
    expect(result.verification).toEqual({ dropped: {}, flags: [], repaired: false });
    expect(result.tokens).toEqual({ prompt: 1000, completion: 200, total: 1200 });
    expect(result.model).toBe('test-model');
    expect(onStage.mock.calls).toEqual([['compose'], ['verify']]);

    expect(chatComplete).toHaveBeenCalledTimes(1);
    const [request] = chatComplete.mock.calls[0];
    expect(request.toolChoice).toEqual({ function: 'submit_brief' });
    expect(Object.keys(request.tools)).toEqual(['submit_brief']);
    expect(request.tools.submit_brief.schema.type).toBe('object');
    expect(request.system).toContain('ENT id');
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].content).toContain('<evidence>');
    expect(request.messages[0].content).toContain('last 7d');
    expect(request.messages[0].content).not.toContain('a.rodriguez');
  });

  it('repairs a structurally invalid brief once and sums tokens', async () => {
    const { chatComplete, run } = setup(
      toolResponse(withVerdictLevel('clear')),
      toolResponse(buildValidBrief(), { prompt: 1500, completion: 250, total: 1750 })
    );
    const result = await run();

    expect(result.verification.repaired).toBe(true);
    expect(result.brief.verdict.level).toBe('urgent');
    expect(result.tokens).toEqual({ prompt: 2500, completion: 450, total: 2950 });

    const [repairRequest] = chatComplete.mock.calls[1];
    const [, assistant, tool] = repairRequest.messages;
    expect(assistant).toEqual(
      expect.objectContaining({
        role: MessageRole.Assistant,
        toolCalls: [expect.objectContaining({ toolCallId: 'call-1' })],
      })
    );
    const { response } = tool as ToolMessage;
    expect(tool).toEqual(
      expect.objectContaining({
        role: MessageRole.Tool,
        toolCallId: 'call-1',
        name: 'submit_brief',
      })
    );
    expect(response).toEqual(
      expect.objectContaining({
        instructions: REPAIR_INSTRUCTIONS,
        problems: [expect.stringContaining('cannot be "clear"')],
      })
    );
  });

  it('repairs schema errors', async () => {
    const { run } = setup(
      toolResponse({ verdict: { level: 'meh' } }),
      toolResponse(buildValidBrief())
    );
    const result = await run();
    expect(result.verification.repaired).toBe(true);
  });

  it('repairs after a tool validation error raised by the inference plugin', async () => {
    const error = new InferenceTaskError(ChatCompletionErrorCode.ToolValidationError, 'invalid', {
      arguments: JSON.stringify({ verdict: {} }),
      errorsText: 'verdict.level: required',
      toolCalls: [
        { toolCallId: 'call-0', function: { name: 'submit_brief', arguments: '{"verdict":{}}' } },
      ],
    });
    const { chatComplete, run } = setup(error, toolResponse(buildValidBrief()));
    const result = await run();
    expect(result.verification.repaired).toBe(true);
    // Usage of the failed call is not reported by the plugin.
    expect(result.tokens).toEqual({ prompt: 1000, completion: 200, total: 1200 });
    const [repairRequest] = chatComplete.mock.calls[1];
    expect(repairRequest.messages[2]).toEqual(expect.objectContaining({ toolCallId: 'call-0' }));
  });

  it('fails with llm_output when the repaired brief is still invalid', async () => {
    const { chatComplete, run } = setup(
      toolResponse(withVerdictLevel('clear')),
      toolResponse(withVerdictLevel('clear'))
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

  it('asks for a tool call with a user message when none was made', async () => {
    const { chatComplete, run } = setup(
      { content: 'Here is the brief', toolCalls: [] },
      toolResponse(buildValidBrief())
    );
    await run();
    const [repairRequest] = chatComplete.mock.calls[1];
    expect(repairRequest.messages[1]).toEqual(
      expect.objectContaining({
        role: MessageRole.User,
        content: expect.stringContaining('No submit_brief tool call was made'),
      })
    );
  });

  it('maps connector errors to llm_error', async () => {
    const { run } = setup(new Error('connector unreachable'));
    await expect(run()).rejects.toEqual(
      expect.objectContaining({
        code: 'llm_error',
        message: expect.stringContaining('unreachable'),
      })
    );
  });

  it('honours the abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const { chatComplete, run } = setup(toolResponse(buildValidBrief()));
    await expect(run(controller.signal)).rejects.toEqual(
      expect.objectContaining({ code: 'llm_error', message: expect.stringContaining('aborted') })
    );
    expect(chatComplete).not.toHaveBeenCalled();
  });

  it('keeps item-level problems as drops and flags without a repair', async () => {
    const brief = buildValidBrief();
    brief.threats[1].narrative = 'ENT-5 owns ENT-6 and raised 999 alerts.';
    const { chatComplete, run } = setup(toolResponse(brief));
    const result = await run();
    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(result.brief.threats).toHaveLength(1);
    expect(result.verification).toEqual(
      expect.objectContaining({ dropped: { number: 1 }, repaired: false })
    );
  });
});

describe('normalizeBriefOutput', () => {
  it('cuts lists that are too long and removes a null threat reference', () => {
    const brief = buildValidBrief();
    const output = {
      ...brief,
      verdict: { ...brief.verdict, evidence: Array.from({ length: 30 }, (_, i) => `F-${i}`) },
      threats: [brief.threats[0], brief.threats[0], brief.threats[0], brief.threats[0]],
      actions: [{ ...brief.actions[0], threat: null }],
    };
    expect(normalizeBriefOutput(output)).toEqual(
      expect.objectContaining({
        verdict: expect.objectContaining({ evidence: output.verdict.evidence.slice(0, 24) }),
        threats: [brief.threats[0], brief.threats[0], brief.threats[0]],
        actions: [expect.not.objectContaining({ threat: null })],
      })
    );
  });
});
