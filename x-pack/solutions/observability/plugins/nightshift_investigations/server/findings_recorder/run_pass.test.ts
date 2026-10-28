/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { MessageRole } from '@kbn/inference-common';
import { createOptimizeModel } from '../lib/create_optimize_model';
import type { RecorderMemory } from './coordinator';
import { FINAL_INSTRUCTION, FINDINGS_RECORDER_SYSTEM_PROMPT, LIVE_INSTRUCTION } from './prompt';
import { limitToOneConfirmed, runFindingsPass, type FindingsPassDeps } from './run_pass';

jest.mock('../lib/create_optimize_model', () => ({ createOptimizeModel: jest.fn() }));

const output = {
  summary: 'Checkout errors rose after the 01:00 deploy.',
  verdict: 'The deploy doubled DB latency.',
  severity: 'high',
  impact_summary: 'Checkout failed for 10 minutes.',
  impact_entities: [{ name: 'checkout' }],
  hypotheses: [
    {
      candidate: 'Bad deploy',
      confidence: 0.9,
      status: 'confirmed',
      reason: 'Timing and diff match.',
    },
    { candidate: 'Traffic spike', confidence: 0.1, status: 'dismissed' },
  ],
};

const answerWith = (args: unknown) => ({
  content: '',
  toolCalls: [{ toolCallId: 'x', function: { name: 'structuredOutput', arguments: args } }],
});

describe('limitToOneConfirmed', () => {
  it('keeps the first confirmed hypothesis and reopens the rest', () => {
    const result = limitToOneConfirmed([
      { candidate: 'a', confidence: 0.9, status: 'confirmed' },
      { candidate: 'b', confidence: 0.8, status: 'confirmed' },
      { candidate: 'c', confidence: 0.1, status: 'dismissed' },
    ]);

    expect(result.map(({ status }) => status)).toEqual(['confirmed', 'investigating', 'dismissed']);
  });
});

describe('runFindingsPass', () => {
  const request = httpServerMock.createKibanaRequest();
  const guard = { signal: new AbortController().signal, claimWrite: jest.fn(() => true) };
  const steps = [] as never[];

  const setup = ({
    answers = [answerWith(output)] as unknown[],
    earlier = [] as never[],
    events = [] as Array<Record<string, unknown>>,
  } = {}) => {
    const writer = {
      setHypotheses: jest.fn().mockResolvedValue(undefined),
      setImpact: jest.fn().mockResolvedValue(undefined),
      getFindings: jest.fn().mockResolvedValue({ hypotheses: [] }),
    };
    const patchMetadata = jest.fn().mockResolvedValue(undefined);
    const chatComplete = jest.fn();
    answers.forEach((answer) => chatComplete.mockResolvedValueOnce(answer));
    chatComplete.mockResolvedValue({ content: '' });
    jest
      .mocked(createOptimizeModel)
      .mockResolvedValue({ inferenceClient: { chatComplete } } as never);
    const memory: RecorderMemory = { turns: jest.fn(() => earlier), remember: jest.fn() };
    const deps: FindingsPassDeps = {
      getAgentBuilder: () =>
        ({
          conversations: {
            getScopedClient: async () => ({ patchMetadata, get: async () => ({ events }) }),
          },
        } as never),
      getInference: () => ({} as never),
      getSavedObjects: () => ({} as never),
      getUiSettings: () => ({} as never),
      getAgenticInvestigations: () => ({ getFindingsWriter: () => writer } as never),
      logger: loggerMock.create(),
    };
    return { deps, writer, patchMetadata, chatComplete, memory };
  };

  const run = (deps: FindingsPassDeps, memory: RecorderMemory, extra = {}) =>
    runFindingsPass(deps, {
      request,
      conversationId: 'c1',
      steps,
      guard,
      memory,
      question: 'Why?',
      ...extra,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    guard.claimWrite.mockReturnValue(true);
  });

  it('asks as a conversation: question, then the live instruction, forcing the answer tool', async () => {
    const { deps, chatComplete, memory } = setup();

    await run(deps, memory);

    const call = chatComplete.mock.calls[0][0];
    expect(call.system).toBe(FINDINGS_RECORDER_SYSTEM_PROMPT);
    expect(call.messages[0]).toMatchObject({ role: MessageRole.User, content: 'Why?' });
    expect(call.messages.at(-1)).toMatchObject({
      role: MessageRole.User,
      content: LIVE_INSTRUCTION,
    });
    expect(call.toolChoice).toEqual({ function: 'structuredOutput' });
    expect(call.cacheControl).toEqual({ type: 'ephemeral', ttl: '5m' });
    expect(call.sessionId).toBe('c1');
    expect(Object.keys(call.tools)).toContain('structuredOutput');
  });

  it('tells the recorder a user changed the severity, and does not write one', async () => {
    const { deps, patchMetadata, chatComplete, memory } = setup({
      events: [
        {
          type: 'investigation_severity_changed',
          data: { severity: 'low', previous_severity: 'high' },
          actor: { type: 'user', username: 'jane' },
        },
      ],
    });

    await expect(run(deps, memory)).resolves.toBe(true);

    const sent = chatComplete.mock.calls[0][0].messages as Array<{ content: unknown }>;
    const notice = sent.find(
      ({ content }) => typeof content === 'string' && content.includes('(a human) changed')
    );
    expect(notice?.content).toContain('from "high" to "low"');
    expect(notice?.content).toContain('Do not set the severity');
    expect(patchMetadata).toHaveBeenCalledWith('c1', { summary: output.summary });
  });

  it('does not write a severity a user changed while the model was answering', async () => {
    const events: Array<Record<string, unknown>> = [];
    const { deps, patchMetadata, chatComplete, memory } = setup({ events });
    chatComplete.mockReset();
    chatComplete.mockImplementationOnce(async () => {
      events.push({ type: 'investigation_severity_changed', data: { severity: 'low' } });
      return answerWith(output);
    });

    await expect(run(deps, memory)).resolves.toBe(true);

    expect(patchMetadata).toHaveBeenCalledWith('c1', { summary: output.summary });
  });

  it('starts a follow-up round from the stored record, in its own conversation only', async () => {
    const { deps, writer, memory } = setup();
    writer.getFindings.mockResolvedValue({
      hypotheses: [
        {
          candidate: 'Pool leak',
          confidence: 0.4,
          status: 'investigating',
          reason: 'Not ruled out',
        },
      ],
      impactSummary: 'Checkout is slow',
    });

    await run(deps, memory);

    expect(memory.remember).toHaveBeenCalledWith(
      expect.objectContaining({
        atGroups: 0,
        final: false,
        answer: expect.objectContaining({
          impact_summary: 'Checkout is slow',
          hypotheses: [
            expect.objectContaining({ candidate: 'Pool leak', reason: 'Not ruled out' }),
          ],
        }),
      })
    );
  });

  it('does not seed the recorder when nothing is stored yet', async () => {
    const { deps, memory } = setup();

    await run(deps, memory);

    // Only the record this pass wrote is remembered.
    expect(memory.remember).toHaveBeenCalledTimes(1);
  });

  it("shows the final pass the agent's own answer, so the record cannot drift from it", async () => {
    const { deps, chatComplete, memory } = setup();

    await run(deps, memory, { answer: 'Severity: medium. Root cause: the deploy.' });

    const sent = chatComplete.mock.calls[0][0].messages as Array<{
      role: string;
      content: unknown;
    }>;
    expect(sent.at(-2)).toEqual({
      role: 'assistant',
      content: 'Severity: medium. Root cause: the deploy.',
    });
  });

  it('writes the evidence the recorder read from the conversation', async () => {
    const evidence = {
      description: 'Errors jumped after 01:11.',
      chart: {
        type: 'line' as const,
        title: 'Errors per minute, 01:10 to 01:12 UTC',
        x_axis: { type: 'time' as const },
        y_axis: { unit: 'number' as const },
        series: [
          {
            name: 'errors',
            points: [
              { x: '2026-08-09T01:10:00Z', y: 3 },
              { x: '2026-08-09T01:11:00Z', y: 412 },
            ],
          },
        ],
      },
    };
    const { deps, writer, memory } = setup({
      answers: [
        answerWith({
          ...output,
          impact_evidence: evidence,
          hypotheses: [{ ...output.hypotheses[0], evidence: [evidence] }, output.hypotheses[1]],
        }),
      ],
    });

    await run(deps, memory);

    expect(writer.setImpact).toHaveBeenCalledWith(expect.objectContaining({ evidence }));
    expect(writer.setHypotheses).toHaveBeenCalledWith({
      conversationId: 'c1',
      hypotheses: [expect.objectContaining({ evidence: [evidence] }), output.hypotheses[1]],
    });
  });

  it('starts a follow-up round with the evidence already stored', async () => {
    const { deps, writer, memory } = setup();
    writer.getFindings.mockResolvedValue({
      hypotheses: [
        {
          candidate: 'Pool leak',
          confidence: 0.4,
          status: 'investigating',
          evidence: [{ description: 'Pool at 100%.' }],
        },
      ],
      impactSummary: 'Checkout is slow',
      impactEvidence: { description: 'Latency doubled.' },
    });

    await run(deps, memory);

    expect(memory.remember).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: expect.objectContaining({
          impact_evidence: { description: 'Latency doubled.' },
          hypotheses: [expect.objectContaining({ evidence: [{ description: 'Pool at 100%.' }] })],
        }),
      })
    );
  });

  it('writes summary, severity, hypotheses and impact from a live pass, without a verdict', async () => {
    const { deps, writer, patchMetadata, memory } = setup();

    await expect(run(deps, memory)).resolves.toBe(true);

    expect(patchMetadata).toHaveBeenCalledWith('c1', { summary: output.summary, severity: 'high' });
    expect(writer.setHypotheses).toHaveBeenCalledWith({
      conversationId: 'c1',
      hypotheses: output.hypotheses,
    });
    // One entity is not the entity form, so the list is cleared and the summary stands alone.
    expect(writer.setImpact).toHaveBeenCalledWith({
      conversationId: 'c1',
      summary: output.impact_summary,
      entities: [],
    });
  });

  it('keeps the stored entities and evidence when a pass leaves them out', async () => {
    const { impact_entities: _omitted, ...withoutEntities } = output;
    const { deps, writer, memory } = setup({ answers: [answerWith(withoutEntities)] });

    await run(deps, memory);

    const [params] = writer.setImpact.mock.calls[0];
    expect(params).not.toHaveProperty('entities');
    expect(params).not.toHaveProperty('evidence');
  });

  it('clears the stored entities when a pass sends an empty list', async () => {
    const { deps, writer, memory } = setup({
      answers: [answerWith({ ...output, impact_entities: [] })],
    });

    await run(deps, memory);

    expect(writer.setImpact).toHaveBeenCalledWith(expect.objectContaining({ entities: [] }));
  });

  it('removes the stored impact evidence when a pass retracts it with null', async () => {
    const { deps, writer, memory } = setup({
      answers: [answerWith({ ...output, impact_evidence: null })],
    });

    await run(deps, memory);

    expect(writer.setImpact).toHaveBeenCalledWith(expect.objectContaining({ evidence: null }));
  });

  it('gives an entity with a long name an id within the store limit', async () => {
    const longName = 'x'.repeat(400);
    const { deps, writer, memory } = setup({
      answers: [
        answerWith({ ...output, impact_entities: [{ name: longName }, { name: 'checkout' }] }),
      ],
    });

    await run(deps, memory);

    const [{ entities }] = writer.setImpact.mock.calls[0];
    expect(entities[0].name).toBe(longName);
    expect(entities[0].id.length).toBeLessThanOrEqual(256);
    expect(entities[1]).toEqual({ id: 'checkout', name: 'checkout' });
  });

  it("asks for the model of the investigation's connector", async () => {
    const { deps, memory } = setup();

    await run(deps, memory, { connectorId: 'custom-connector' });

    expect(createOptimizeModel).toHaveBeenCalledWith(
      expect.objectContaining({ roundConnectorId: 'custom-connector' })
    );
  });

  it('keeps its answer in the conversation for the next pass', async () => {
    const { deps, memory } = setup();

    await run(deps, memory);

    expect(memory.remember).toHaveBeenCalledWith({
      atGroups: 0,
      final: false,
      answer: expect.objectContaining({ summary: output.summary }),
    });
  });

  it('replays its earlier answers when asked again', async () => {
    const earlier = [
      { atGroups: 0, final: false, answer: { summary: 'early', hypotheses: [] } },
    ] as never[];
    const { deps, chatComplete, memory } = setup({ earlier });

    await run(deps, memory);

    const sent = chatComplete.mock.calls[0][0].messages;
    expect(
      sent.some(
        (m: { toolCalls?: Array<{ function: { name: string } }> }) =>
          m.toolCalls?.[0].function.name === 'structuredOutput'
      )
    ).toBe(true);
  });

  it('adds the verdict on the final pass and asks the final question', async () => {
    const { deps, patchMetadata, chatComplete, memory } = setup();

    await run(deps, memory, { answer: 'Root cause: deploy' });

    expect(patchMetadata).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ verdict: output.verdict })
    );
    expect(chatComplete.mock.calls[0][0].messages.at(-1)).toMatchObject({
      content: FINAL_INSTRUCTION,
    });
  });

  it('asks again when the structured answer is unusable, and writes the second', async () => {
    const { deps, chatComplete, patchMetadata, memory } = setup({
      answers: [{ content: 'sorry' }, answerWith(output)],
    });

    await expect(run(deps, memory)).resolves.toBe(true);

    expect(chatComplete).toHaveBeenCalledTimes(2);
    expect(patchMetadata).toHaveBeenCalled();
  });

  it("falls back to the agent's answer as verdict and summary when no attempt is usable", async () => {
    const { deps, writer, patchMetadata, memory } = setup({
      answers: [{ content: 'a' }, { content: 'b' }],
    });

    await run(deps, memory, { answer: 'Root cause: deploy' });

    expect(patchMetadata).toHaveBeenCalledWith('c1', {
      summary: 'Root cause: deploy',
      verdict: 'Root cause: deploy',
    });
    expect(writer.setHypotheses).not.toHaveBeenCalled();
    expect(memory.remember).not.toHaveBeenCalled();
  });

  it('writes nothing from a live pass with no usable answer', async () => {
    const { deps, patchMetadata, memory } = setup({
      answers: [{ content: 'a' }, { content: 'b' }],
    });

    await expect(run(deps, memory)).resolves.toBe(false);
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it('writes nothing, and remembers nothing, when a newer pass owns the investigation', async () => {
    guard.claimWrite.mockReturnValue(false);
    const { deps, writer, patchMetadata, memory } = setup();

    await expect(run(deps, memory)).resolves.toBe(false);
    expect(patchMetadata).not.toHaveBeenCalled();
    expect(writer.setHypotheses).not.toHaveBeenCalled();
    expect(memory.remember).not.toHaveBeenCalled();
  });

  it('keeps writing the other records when one write fails', async () => {
    const { deps, writer, patchMetadata, memory } = setup();
    writer.setHypotheses.mockRejectedValue(new Error('conflict'));

    await expect(run(deps, memory)).resolves.toBe(true);
    expect(patchMetadata).toHaveBeenCalled();
    expect(writer.setImpact).toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('hypotheses'));
  });

  it('does nothing when the plugins it writes through are missing', async () => {
    const { deps, memory } = setup();

    await expect(run({ ...deps, getAgenticInvestigations: () => undefined }, memory)).resolves.toBe(
      false
    );
  });
});
