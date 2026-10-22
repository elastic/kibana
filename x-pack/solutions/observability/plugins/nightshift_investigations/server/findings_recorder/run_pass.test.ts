/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createOptimizeModel } from '../lib/create_optimize_model';
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

  const setup = ({ modelOutput = output as unknown } = {}) => {
    const writer = {
      setHypotheses: jest.fn().mockResolvedValue(undefined),
      setImpact: jest.fn().mockResolvedValue(undefined),
    };
    const patchMetadata = jest.fn().mockResolvedValue(undefined);
    const outputFn = jest.fn().mockResolvedValue({ output: modelOutput });
    jest
      .mocked(createOptimizeModel)
      .mockResolvedValue({ inferenceClient: { output: outputFn } } as never);
    const deps: FindingsPassDeps = {
      getAgentBuilder: () =>
        ({ conversations: { getScopedClient: async () => ({ patchMetadata }) } } as never),
      getInference: () => ({} as never),
      getSavedObjects: () => ({} as never),
      getUiSettings: () => ({} as never),
      getAgenticInvestigations: () =>
        ({
          getInvestigationsClient: () => ({
            get: jest.fn().mockResolvedValue({ metadata: { status: 'open' } }),
          }),
          getFindingsWriter: () => writer,
        } as never),
      logger: loggerMock.create(),
    };
    return { deps, writer, patchMetadata, outputFn };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    guard.claimWrite.mockReturnValue(true);
  });

  it('writes summary, severity, hypotheses and impact from a live pass, without a verdict', async () => {
    const { deps, writer, patchMetadata } = setup();

    await expect(
      runFindingsPass(deps, { request, conversationId: 'c1', steps, guard })
    ).resolves.toBe(true);

    expect(patchMetadata).toHaveBeenCalledWith('c1', {
      summary: output.summary,
      severity: 'high',
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

  it('adds the verdict on the final pass and tells the model the agent has finished', async () => {
    const { deps, patchMetadata, outputFn } = setup();

    await runFindingsPass(deps, {
      request,
      conversationId: 'c1',
      steps,
      guard,
      answer: 'Root cause: deploy',
    });

    expect(patchMetadata).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ verdict: output.verdict })
    );
    expect(outputFn.mock.calls[0][0].input).toContain('Root cause: deploy');
  });

  it("falls back to the agent's answer as the verdict when the model output is unusable", async () => {
    const { deps, writer, patchMetadata } = setup({ modelOutput: { nonsense: true } });

    await runFindingsPass(deps, {
      request,
      conversationId: 'c1',
      steps,
      guard,
      answer: 'Root cause: deploy',
    });

    // The answer also replaces any early live summary, which would otherwise read "just started".
    expect(patchMetadata).toHaveBeenCalledWith('c1', {
      summary: 'Root cause: deploy',
      verdict: 'Root cause: deploy',
    });
    expect(writer.setHypotheses).not.toHaveBeenCalled();
  });

  it('asks the model again when its structured answer is malformed', async () => {
    const { deps, outputFn } = setup();

    await runFindingsPass(deps, { request, conversationId: 'c1', steps, guard });

    expect(outputFn.mock.calls[0][0].retry).toEqual({ onValidationError: 2 });
  });

  it('writes nothing from a live pass whose output is unusable', async () => {
    const { deps, patchMetadata } = setup({ modelOutput: { nonsense: true } });

    await expect(
      runFindingsPass(deps, { request, conversationId: 'c1', steps, guard })
    ).resolves.toBe(false);
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it('writes nothing when a newer pass owns the investigation', async () => {
    guard.claimWrite.mockReturnValue(false);
    const { deps, writer, patchMetadata } = setup();

    await expect(
      runFindingsPass(deps, { request, conversationId: 'c1', steps, guard })
    ).resolves.toBe(false);
    expect(patchMetadata).not.toHaveBeenCalled();
    expect(writer.setHypotheses).not.toHaveBeenCalled();
  });

  it('keeps writing the other records when one write fails', async () => {
    const { deps, writer, patchMetadata } = setup();
    writer.setHypotheses.mockRejectedValue(new Error('conflict'));

    await expect(
      runFindingsPass(deps, { request, conversationId: 'c1', steps, guard })
    ).resolves.toBe(true);
    expect(patchMetadata).toHaveBeenCalled();
    expect(writer.setImpact).toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('hypotheses'));
  });

  it('does nothing when the plugins it writes through are missing', async () => {
    const { deps } = setup();

    await expect(
      runFindingsPass(
        { ...deps, getAgenticInvestigations: () => undefined },
        { request, conversationId: 'c1', steps, guard }
      )
    ).resolves.toBe(false);
  });
});
