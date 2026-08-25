/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CostTraceBuilder, extractUsageFromMetadata } from './cost_tracker';

const anthropicUsage = (input: number, output: number) => ({
  usage: { input_tokens: input, output_tokens: output },
});

describe('extractUsageFromMetadata', () => {
  it('reads the Anthropic shape', () => {
    expect(extractUsageFromMetadata(anthropicUsage(100, 20))).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
    });
  });

  it('reads the OpenAI-compatible shape', () => {
    expect(
      extractUsageFromMetadata({
        tokenUsage: { promptTokens: 7, completionTokens: 3, totalTokens: 10 },
      })
    ).toEqual({ inputTokens: 7, outputTokens: 3, totalTokens: 10 });
  });

  it('returns zeros when the connector emits no usage', () => {
    expect(extractUsageFromMetadata({})).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });

  // `??` only catches null and undefined, so a non-numeric count used to become NaN
  // and propagate through every total.
  it.each([
    ['a non-numeric string', 'n/a'],
    ['an object', {}],
    ['a negative number', -5],
    ['NaN itself', Number.NaN],
  ])('treats %s as zero rather than letting NaN through', (_label, value) => {
    const usage = extractUsageFromMetadata({ usage: { input_tokens: value, output_tokens: 4 } });
    expect(usage.inputTokens).toBe(0);
    expect(Number.isFinite(usage.totalTokens)).toBe(true);
  });
});

describe('CostTraceBuilder', () => {
  const addStage = (builder: CostTraceBuilder, modelName: string | undefined) =>
    builder.addStage({
      stage: 'enrich_taxonomy',
      inferenceEndpointId: '.some-endpoint',
      modelName,
      metadata: anthropicUsage(1_000_000, 1_000_000),
      wallMs: 500,
    });

  it('prices a known model', () => {
    const builder = new CostTraceBuilder();
    addStage(builder, '.anthropic-claude-4.5-haiku-chat_completion');

    const trace = builder.build();

    // 1M input at $0.80 + 1M output at $4.00
    expect(trace.stages[0].cost_usd).toBeCloseTo(4.8);
    expect(trace.total_cost_usd).toBeCloseTo(4.8);
    expect(trace.unpriced_stage_count).toBe(0);
  });

  // Reporting 0 for an unpriced model made real spend indistinguishable from no
  // spend, so an operator watching total_cost_usd saw $0 while money burned.
  it('reports an unknown model as unpriced rather than free', () => {
    const builder = new CostTraceBuilder();
    addStage(builder, '.some-model-nobody-priced');

    const trace = builder.build();

    expect(trace.stages[0].cost_usd).toBeNull();
    expect(trace.unpriced_stage_count).toBe(1);
  });

  it('totals only the priced stages and says how many were not', () => {
    const builder = new CostTraceBuilder();
    addStage(builder, '.anthropic-claude-4.5-haiku-chat_completion');
    addStage(builder, '.some-model-nobody-priced');

    const trace = builder.build();

    expect(trace.total_cost_usd).toBeCloseTo(4.8);
    expect(trace.unpriced_stage_count).toBe(1);
    expect(trace.total_input_tokens).toBe(2_000_000);
  });

  it('warns once per unknown model, not once per call', () => {
    const logger = loggingSystemMock.createLogger();
    const builder = new CostTraceBuilder(logger);

    addStage(builder, '.some-model-nobody-priced');
    addStage(builder, '.some-model-nobody-priced');
    addStage(builder, '.another-unpriced-model');

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect((logger.warn as jest.Mock).mock.calls[0][0]).toContain('no pricing row');
  });

  it('does not warn for a priced model', () => {
    const logger = loggingSystemMock.createLogger();
    const builder = new CostTraceBuilder(logger);

    addStage(builder, '.anthropic-claude-4.6-opus-chat_completion');

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
