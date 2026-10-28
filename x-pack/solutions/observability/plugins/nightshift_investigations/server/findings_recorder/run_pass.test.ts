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
import { FINAL_INSTRUCTION, LIVE_INSTRUCTION, buildRecorderSystemPrompt } from './prompt';
import {
  limitToOneConfirmed,
  runFindingsPass,
  toImpactEntities,
  type FindingsPassDeps,
} from './run_pass';

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
    workspace = undefined as unknown,
  } = {}) => {
    const writer = {
      setHypotheses: jest.fn().mockResolvedValue(undefined),
      setImpact: jest.fn().mockResolvedValue(undefined),
      getFindings: jest.fn().mockResolvedValue({ hypotheses: [], impactEntities: [] }),
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
      ...(workspace ? { getWorkspace: jest.fn().mockResolvedValue(workspace) } : {}),
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
    expect(call.system).toBe(buildRecorderSystemPrompt({ final: false }));
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
      impactEntities: [],
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

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

    expect(writer.setImpact).toHaveBeenCalledWith(expect.objectContaining({ evidence }));
    expect(writer.setHypotheses).toHaveBeenCalledWith({
      conversationId: 'c1',
      hypotheses: [expect.objectContaining({ evidence: [evidence] }), output.hypotheses[1]],
    });
  });

  it('starts a follow-up round with the evidence already stored', async () => {
    const { deps, writer, memory } = setup();
    writer.getFindings.mockResolvedValue({
      impactEntities: [],
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

  it('writes only the summary and the hypotheses from a live pass', async () => {
    const { deps, writer, patchMetadata, memory } = setup();

    await expect(run(deps, memory)).resolves.toBe(true);

    // The severity, verdict and impact the model sent are left for the final pass.
    expect(patchMetadata).toHaveBeenCalledWith('c1', { summary: output.summary });
    expect(writer.setHypotheses).toHaveBeenCalledWith({
      conversationId: 'c1',
      hypotheses: output.hypotheses,
    });
    expect(writer.setImpact).not.toHaveBeenCalled();
  });

  it('writes the summary, severity, verdict, hypotheses and impact from the final pass', async () => {
    const { deps, writer, patchMetadata, memory } = setup();

    await expect(run(deps, memory, { answer: 'Root cause: bad deploy' })).resolves.toBe(true);

    expect(patchMetadata).toHaveBeenCalledWith('c1', {
      summary: output.summary,
      severity: 'high',
      verdict: output.verdict,
    });
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

  it('asks a live pass for the live schema and a final pass for the full one', async () => {
    const live = setup();
    await run(live.deps, live.memory);
    const final = setup();
    await run(final.deps, final.memory, { answer: 'Root cause: bad deploy' });

    const schemaOf = (chatComplete: jest.Mock) =>
      chatComplete.mock.calls[0][0].tools.structuredOutput.schema.properties;
    expect(Object.keys(schemaOf(live.chatComplete))).toEqual(['summary', 'hypotheses']);
    expect(Object.keys(schemaOf(final.chatComplete))).toEqual(
      expect.arrayContaining(['verdict', 'severity', 'impact_summary', 'impact_entities'])
    );
  });

  it('keeps stored hypothesis evidence through a live pass, which carries none', async () => {
    const stored = { description: 'Pool at 100%.' };
    const { deps, writer, memory } = setup({
      answers: [
        answerWith({
          ...output,
          hypotheses: [{ ...output.hypotheses[0], evidence: [{ description: 'ignored' }] }],
        }),
      ],
    });
    writer.getFindings.mockResolvedValue({
      hypotheses: [{ ...output.hypotheses[0], evidence: [stored] }],
      impactEntities: [],
    });

    await run(deps, memory);

    expect(writer.setHypotheses).toHaveBeenCalledWith({
      conversationId: 'c1',
      hypotheses: [expect.objectContaining({ candidate: 'Bad deploy', evidence: [stored] })],
    });
  });

  it('keeps the stored entities and evidence when a pass leaves them out', async () => {
    const { impact_entities: _omitted, ...withoutEntities } = output;
    const { deps, writer, memory } = setup({ answers: [answerWith(withoutEntities)] });

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

    const [params] = writer.setImpact.mock.calls[0];
    expect(params).not.toHaveProperty('entities');
    expect(params).not.toHaveProperty('evidence');
  });

  it('clears the stored entities when a pass sends an empty list', async () => {
    const { deps, writer, memory } = setup({
      answers: [answerWith({ ...output, impact_entities: [] })],
    });

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

    expect(writer.setImpact).toHaveBeenCalledWith(expect.objectContaining({ entities: [] }));
  });

  it('removes the stored impact evidence when a pass retracts it with null', async () => {
    const { deps, writer, memory } = setup({
      answers: [answerWith({ ...output, impact_evidence: null })],
    });

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

    expect(writer.setImpact).toHaveBeenCalledWith(expect.objectContaining({ evidence: null }));
  });

  it('gives an entity with a long name an id within the store limit', async () => {
    const longName = 'x'.repeat(400);
    const { deps, writer, memory } = setup({
      answers: [
        answerWith({ ...output, impact_entities: [{ name: longName }, { name: 'checkout' }] }),
      ],
    });

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

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

  it('writes each entity with its own evidence', async () => {
    const evidence = { description: 'Checkout error rate rose to 40%.' };
    const { deps, writer, memory } = setup({
      answers: [
        answerWith({
          ...output,
          impact_entities: [{ name: 'checkout', evidence }, { name: 'payments' }],
        }),
      ],
    });

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

    const [{ entities }] = writer.setImpact.mock.calls[0];
    expect(entities).toEqual([
      { id: 'checkout', name: 'checkout', evidence },
      { id: 'payments', name: 'payments' },
    ]);
  });

  it('keeps the stored evidence of an entity the model lists again without any', async () => {
    const stored = { description: 'Payments timeouts began at 01:12.' };
    const { deps, writer, memory } = setup({
      answers: [
        answerWith({ ...output, impact_entities: [{ name: 'checkout' }, { name: 'payments' }] }),
      ],
    });
    writer.getFindings.mockResolvedValue({
      hypotheses: [],
      impactEntities: [{ id: 'payments', name: 'payments', evidence: stored }],
    });

    await run(deps, memory, { answer: 'Root cause: bad deploy' });

    const [{ entities }] = writer.setImpact.mock.calls[0];
    expect(entities).toEqual([
      { id: 'checkout', name: 'checkout' },
      { id: 'payments', name: 'payments', evidence: stored },
    ]);
  });

  it('starts a follow-up round with the stored entities and their evidence', async () => {
    const { deps, writer, memory } = setup();
    writer.getFindings.mockResolvedValue({
      hypotheses: [{ candidate: 'Pool leak', confidence: 0.4, status: 'investigating' }],
      impactSummary: 'Checkout is slow',
      impactEntities: [
        { id: 'checkout', name: 'Checkout', type: 'service', evidence: { description: 'Slow.' } },
        { id: 'db' },
      ],
    });

    await run(deps, memory);

    expect(memory.remember).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: expect.objectContaining({
          impact_entities: [
            { name: 'Checkout', type: 'service', evidence: { description: 'Slow.' } },
            { name: 'db' },
          ],
        }),
      })
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

    await expect(run(deps, memory, { answer: 'Root cause: bad deploy' })).resolves.toBe(true);
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

describe('runFindingsPass with workspace files', () => {
  const request = httpServerMock.createKibanaRequest();
  const guard = { signal: new AbortController().signal, claimWrite: jest.fn(() => true) };
  const long = 'x'.repeat(3_000);
  const stepsWithLongResult = [
    {
      type: 'tool_call',
      tool_id: 'nightshift_sandbox_bash',
      tool_call_id: 'tc1',
      tool_call_group_id: 'g1',
      params: { command: 'curl metrics' },
      results: [{ type: 'other', data: { stdout: long } }],
    },
  ] as never[];

  const workspace = () => ({
    writeResults: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('t,value\n01:10,3\n01:11,412'),
  });
  const readCall = (id: string, path: string) => ({
    content: '',
    toolCalls: [{ toolCallId: id, function: { name: 'recorder_read_file', arguments: { path } } }],
  });

  const setupFiles = (answers: unknown[], ws = workspace()) => {
    const writer = {
      setHypotheses: jest.fn().mockResolvedValue(undefined),
      setImpact: jest.fn().mockResolvedValue(undefined),
      getFindings: jest.fn().mockResolvedValue({ hypotheses: [], impactEntities: [] }),
    };
    const chatComplete = jest.fn();
    answers.forEach((answer) => chatComplete.mockResolvedValueOnce(answer));
    chatComplete.mockResolvedValue({ content: '' });
    jest
      .mocked(createOptimizeModel)
      .mockResolvedValue({ inferenceClient: { chatComplete } } as never);
    const memory: RecorderMemory = { turns: jest.fn(() => []), remember: jest.fn() };
    const getWorkspace = jest.fn().mockResolvedValue(ws);
    const deps: FindingsPassDeps = {
      getAgentBuilder: () =>
        ({
          conversations: {
            getScopedClient: async () => ({
              patchMetadata: jest.fn().mockResolvedValue(undefined),
              get: async () => ({ events: [] }),
            }),
          },
        } as never),
      getInference: () => ({} as never),
      getSavedObjects: () => ({} as never),
      getUiSettings: () => ({} as never),
      getAgenticInvestigations: () => ({ getFindingsWriter: () => writer } as never),
      getWorkspace,
      logger: loggerMock.create(),
    };
    const run = (extra = {}) =>
      runFindingsPass(deps, {
        request,
        conversationId: 'c1',
        steps: stepsWithLongResult,
        guard,
        memory,
        question: 'Why?',
        answer: 'Root cause: bad deploy',
        ...extra,
      });
    return { run, ws, chatComplete, writer, getWorkspace, deps };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    guard.claimWrite.mockReturnValue(true);
  });

  it('writes the full text of a clipped result and tells the recorder where it is', async () => {
    const { run, ws, chatComplete } = setupFiles([answerWith(output)]);

    await run();

    expect(ws.writeResults).toHaveBeenCalledWith([
      expect.objectContaining({
        path: '/workspace/.recorder/results/001-nightshift_sandbox_bash.txt',
        content: long,
      }),
    ]);
    const sent = JSON.stringify(chatComplete.mock.calls[0][0].messages);
    expect(sent).toContain(
      'full output in /workspace/.recorder/results/001-nightshift_sandbox_bash.txt'
    );
  });

  it('lets the final pass read a file, then answer with what it read', async () => {
    const record = { ...output, impact_evidence: { description: 'Errors went from 3 to 412.' } };
    const { run, ws, chatComplete, writer } = setupFiles([
      readCall('r1', '/workspace/.recorder/results/001-nightshift_sandbox_bash.txt'),
      answerWith(record),
    ]);

    await expect(run()).resolves.toBe(true);

    expect(ws.readFile).toHaveBeenCalledWith({
      path: '/workspace/.recorder/results/001-nightshift_sandbox_bash.txt',
      offset: undefined,
      length: undefined,
    });
    // The second call sees the file's text as the tool's result.
    expect(JSON.stringify(chatComplete.mock.calls[1][0].messages)).toContain('01:11,412');
    const first = chatComplete.mock.calls[0][0];
    expect(first.toolChoice).toBe('auto');
    expect(first.tools).toHaveProperty('recorder_read_file');
    expect(first.tools).not.toHaveProperty('recorder_list_files');
    expect(first.tools).not.toHaveProperty('recorder_write_file');
    expect(writer.setImpact).toHaveBeenCalledWith(
      expect.objectContaining({ evidence: { description: 'Errors went from 3 to 412.' } })
    );
  });

  it('gives a live pass no workspace and no file tools', async () => {
    const { run, getWorkspace, chatComplete } = setupFiles([answerWith(output)]);

    await run({ answer: undefined });

    expect(getWorkspace).not.toHaveBeenCalled();
    expect(chatComplete.mock.calls[0][0].tools).not.toHaveProperty('recorder_read_file');
  });

  it('forces the answer on the last round', async () => {
    const reads = Array.from({ length: 9 }, (_, i) => readCall(`r${i}`, '/workspace/a.txt'));
    const { run, chatComplete } = setupFiles([...reads, answerWith(output)]);

    await run();

    const choices = chatComplete.mock.calls.map(([call]) => call.toolChoice);
    expect(choices).toHaveLength(10);
    expect(choices.slice(0, 9).every((choice) => choice === 'auto')).toBe(true);
    expect(choices[9]).toEqual({ function: 'structuredOutput' });
  });

  it('answers a read it cannot make with an error, and keeps going', async () => {
    const { run, ws } = setupFiles([readCall('r1', '/etc/passwd'), answerWith(output)]);
    ws.readFile.mockResolvedValue('Error: Only paths under /workspace can be read.');

    await expect(run()).resolves.toBe(true);
  });

  it('gives each kind of pass its own system prompt, each asking for structured output', () => {
    const live = buildRecorderSystemPrompt({ final: false });
    const finalPlain = buildRecorderSystemPrompt({ final: true });
    const finalFiles = buildRecorderSystemPrompt({ final: true, files: true });

    // A live pass is not told about the fields it does not write, or the files it cannot read.
    expect(live).toContain('hypotheses');
    for (const only of ['impact', 'severity', 'verdict', 'recorder_read_file']) {
      expect(live).not.toContain(only);
    }
    expect(finalPlain).toContain('impact');
    expect(finalPlain).not.toContain('recorder_read_file');
    expect(finalFiles).toContain('recorder_read_file');
    for (const prompt of [live, finalPlain, finalFiles]) {
      expect(prompt).toContain('structuredOutput');
    }
  });

  it('sends the prompt that matches the pass', async () => {
    const files = setupFiles([answerWith(output)]);
    await files.run();
    const live = setupFiles([answerWith(output)]);
    await live.run({ answer: undefined });

    expect(files.chatComplete.mock.calls[0][0].system).toBe(
      buildRecorderSystemPrompt({ final: true, files: true })
    );
    expect(live.chatComplete.mock.calls[0][0].system).toBe(
      buildRecorderSystemPrompt({ final: false })
    );
  });

  it('falls back to one call without files when the model never answers with them', async () => {
    const { run, chatComplete, writer } = setupFiles([
      { content: 'I have what I need.', toolCalls: [] },
      answerWith(output),
    ]);

    await expect(run()).resolves.toBe(true);

    const fallback = chatComplete.mock.calls[1][0];
    expect(fallback.tools).not.toHaveProperty('recorder_read_file');
    expect(fallback.toolChoice).toEqual({ function: 'structuredOutput' });
    // The replay no longer points at files it cannot be given.
    expect(JSON.stringify(fallback.messages)).not.toContain('full output in');
    expect(writer.setImpact).toHaveBeenCalled();
  });

  it('answers without files when there is no workspace', async () => {
    const { run, deps, chatComplete } = setupFiles([answerWith(output)]);
    (deps.getWorkspace as jest.Mock).mockRejectedValue(new Error('sandbox is not configured'));

    await expect(run()).resolves.toBe(true);

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete.mock.calls[0][0].tools).not.toHaveProperty('recorder_read_file');
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('no workspace'));
  });
});

describe('toImpactEntities', () => {
  it('prefers the evidence the model sent over the stored evidence', () => {
    const sent = { description: 'New.' };
    expect(
      toImpactEntities(
        [{ name: 'checkout', evidence: sent }],
        [{ id: 'checkout', evidence: { description: 'Old.' } }]
      )
    ).toEqual([{ id: 'checkout', name: 'checkout', evidence: sent }]);
  });

  it('does not carry evidence over to an entity that was not stored', () => {
    expect(
      toImpactEntities([{ name: 'new' }], [{ id: 'other', evidence: { description: 'x' } }])
    ).toEqual([{ id: 'new', name: 'new' }]);
  });
});
