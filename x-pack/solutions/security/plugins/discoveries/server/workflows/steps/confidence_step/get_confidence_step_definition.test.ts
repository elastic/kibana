/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { Confidence } from '../../../../common/step_types/shared_schemas';
import { getConfidenceStepDefinition } from './get_confidence_step_definition';
import { scoreWithLlm } from './helpers/score_with_llm';

jest.mock('./helpers/score_with_llm', () => ({ scoreWithLlm: jest.fn() }));
const mockScoreWithLlm = scoreWithLlm as jest.MockedFunction<typeof scoreWithLlm>;

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const llmConfidence: Confidence = {
  band: 'high',
  factors: [{ name: 'evidence_breadth', assessment: '2 datasets' }],
  rationale: 'Coherent multi-stage chain.',
  score: 0.8,
};

const makeGetStartServices = ({
  enabled,
  hasInference = true,
}: {
  enabled: boolean;
  hasInference?: boolean;
}) =>
  jest.fn().mockResolvedValue({
    coreStart: { featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(enabled) } },
    pluginsStart: { inference: hasInference ? { getChatModel: jest.fn() } : undefined },
  });

const makeContext = (connectorId = 'connector-1') => ({
  abortSignal: undefined,
  contextManager: { getFakeRequest: jest.fn().mockReturnValue({ headers: {} }) },
  input: {
    anonymized_alerts: [
      {
        metadata: {},
        page_content: '_id,a1\nevent.category,malware\nevent.dataset,endpoint.alerts',
      },
    ],
    api_config: { connector_id: connectorId },
    attack_discoveries: [
      { alert_ids: ['a1'], details_markdown: 'd', summary_markdown: 's', title: 't' },
    ],
    generation_uuid: 'gen-1',
  },
  logger: mockLogger,
});

// The handler's `context` is a rich StepHandlerContext; the fields above are all
// the confidence handler reads, so we cast at the call site.
const invoke = (getStartServices: jest.Mock, context: ReturnType<typeof makeContext>) => {
  const definition = getConfidenceStepDefinition({ getStartServices, logger: mockLogger });
  return definition.handler(context as unknown as Parameters<typeof definition.handler>[0]);
};

describe('getConfidenceStepDefinition handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is a no-op pass-through when the feature flag is OFF', async () => {
    const context = makeContext();
    const result = await invoke(makeGetStartServices({ enabled: false }), context);

    expect(result.output?.attack_discoveries).toBe(context.input.attack_discoveries);
    expect(result.output?.scored_count).toBe(0);
    expect(mockScoreWithLlm).not.toHaveBeenCalled();
  });

  it('annotates each discovery with the LLM confidence when enabled', async () => {
    mockScoreWithLlm.mockResolvedValue(llmConfidence);
    const result = await invoke(makeGetStartServices({ enabled: true }), makeContext());

    expect(mockScoreWithLlm).toHaveBeenCalledTimes(1);
    expect(result.output?.scored_count).toBe(1);
    const [discovery] = result.output?.attack_discoveries as Array<{ confidence?: Confidence }>;
    expect(discovery.confidence).toEqual(llmConfidence);
  });

  it('falls back to a deterministic confidence when the LLM call throws', async () => {
    mockScoreWithLlm.mockRejectedValue(new Error('connector unavailable'));
    const result = await invoke(makeGetStartServices({ enabled: true }), makeContext());

    expect(mockScoreWithLlm).toHaveBeenCalledTimes(1);
    expect(result.output?.scored_count).toBe(1);
    const [discovery] = result.output?.attack_discoveries as Array<{ confidence?: Confidence }>;
    expect(discovery.confidence?.rationale).toContain('Deterministic fallback');
    expect(typeof discovery.confidence?.score).toBe('number');
  });

  it('uses the deterministic fallback (no LLM call) when inference is unavailable', async () => {
    const result = await invoke(
      makeGetStartServices({ enabled: true, hasInference: false }),
      makeContext()
    );

    expect(mockScoreWithLlm).not.toHaveBeenCalled();
    expect(result.output?.scored_count).toBe(1);
    const [discovery] = result.output?.attack_discoveries as Array<{ confidence?: Confidence }>;
    expect(discovery.confidence?.rationale).toContain('Deterministic fallback');
  });

  it('passes discoveries through unscored when api_config has no connector_id', async () => {
    const context = makeContext('');
    const result = await invoke(makeGetStartServices({ enabled: true }), context);

    expect(result.output?.attack_discoveries).toBe(context.input.attack_discoveries);
    expect(result.output?.scored_count).toBe(0);
    expect(mockScoreWithLlm).not.toHaveBeenCalled();
  });
});
