/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { Confidence } from '../../../../common/step_types/shared_schemas';
import { getGenericConfidenceStepDefinition } from './get_generic_confidence_step_definition';
import { synthesizeConfidence } from './helpers/synthesize_confidence';

jest.mock('./helpers/synthesize_confidence', () => ({ synthesizeConfidence: jest.fn() }));
const mockSynthesize = synthesizeConfidence as jest.MockedFunction<typeof synthesizeConfidence>;

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
  score: 0.82,
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

const makeContext = (input: Record<string, unknown>) => ({
  abortSignal: undefined,
  contextManager: { getFakeRequest: jest.fn().mockReturnValue({ headers: {} }) },
  input,
  logger: mockLogger,
});

const detectionAlerts = {
  alerts: [
    {
      'event.category': 'process',
      'event.dataset': 'endpoint.events.process',
      'threat.tactic.id': 'TA0002',
    },
    {
      'event.category': 'network',
      'event.dataset': 'endpoint.events.network',
      'threat.tactic.id': 'TA0011',
    },
  ],
  api_config: { connector_id: 'connector-1' },
};

const invoke = (getStartServices: jest.Mock, context: ReturnType<typeof makeContext>) => {
  const definition = getGenericConfidenceStepDefinition({ getStartServices, logger: mockLogger });
  return definition.handler(context as unknown as Parameters<typeof definition.handler>[0]);
};

describe('getGenericConfidenceStepDefinition handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the LLM confidence for a detection-alert bundle when enabled', async () => {
    mockSynthesize.mockResolvedValue(llmConfidence);
    const result = await invoke(
      makeGetStartServices({ enabled: true }),
      makeContext(detectionAlerts)
    );

    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(result.output?.alert_count).toBe(2);
    expect(result.output?.confidence).toEqual(llmConfidence);
  });

  it('scores raw ECS alert docs and anonymized CSV together as one bundle', async () => {
    mockSynthesize.mockResolvedValue(llmConfidence);
    const result = await invoke(
      makeGetStartServices({ enabled: true }),
      makeContext({
        ...detectionAlerts,
        anonymized_alerts: [
          {
            metadata: {},
            page_content: '_id,a1\nevent.category,malware\nevent.dataset,endpoint.alerts',
          },
        ],
      })
    );

    // 2 raw docs + 1 anonymized row = one bundle of 3.
    expect(result.output?.alert_count).toBe(3);
  });

  it('falls back to a deterministic confidence when the LLM throws', async () => {
    mockSynthesize.mockRejectedValue(new Error('connector unavailable'));
    const result = await invoke(
      makeGetStartServices({ enabled: true }),
      makeContext(detectionAlerts)
    );

    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(result.output?.confidence.rationale).toContain('Deterministic fallback');
    expect(typeof result.output?.confidence.score).toBe('number');
  });

  it('uses the deterministic fallback (no LLM call) when the flag is OFF', async () => {
    const result = await invoke(
      makeGetStartServices({ enabled: false }),
      makeContext(detectionAlerts)
    );

    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(result.output?.confidence.rationale).toContain('Deterministic fallback');
    expect(result.output?.alert_count).toBe(2);
  });

  it('uses the deterministic fallback when no connector is supplied', async () => {
    const result = await invoke(
      makeGetStartServices({ enabled: true }),
      makeContext({ alerts: detectionAlerts.alerts })
    );

    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(result.output?.confidence.rationale).toContain('Deterministic fallback');
  });

  it('passes the discovery narrative context through to the synthesizer', async () => {
    mockSynthesize.mockResolvedValue(llmConfidence);
    await invoke(
      makeGetStartServices({ enabled: true }),
      makeContext({
        ...detectionAlerts,
        context: {
          mitre_attack_tactics: ['Execution', 'Command and Control'],
          summary_markdown: 'AD summary',
          title: 'AD title',
        },
      })
    );

    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.objectContaining({ title: 'AD title', summary_markdown: 'AD summary' }),
      })
    );
  });
});
