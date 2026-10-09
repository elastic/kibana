/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContextStackEntry } from '@kbn/agent-builder-server';
import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
} from '@kbn/significant-events-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from '../../agents/discovery/discovery';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import { BulkWriteError, MAX_BULK_WRITE_ITEMS } from '../bulk_write';
import { eventsWriteBulkHandler } from './handler';
import { createEventsWriteTool, eventsWriteItemSchema, eventsWriteSchema } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('../../../routes/utils/assert_can_manage_significant_events', () => ({
  assertCanManageSignificantEvents: jest.fn(),
}));

jest.mock('./handler', () => ({
  eventsWriteBulkHandler: jest.fn(),
}));

const input: Partial<SignificantEvent> = {
  event_id: 'event-1',
  status: 'active',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  confidence: 0.8,
};

const getFeatures = jest.fn().mockResolvedValue({ hits: [] });
const getQueryLinks = jest.fn().mockResolvedValue([]);

const createTool = (
  telemetry: { trackAgentToolEventsWrite: jest.Mock },
  logger = loggingSystemMock.createLogger()
) => {
  const getScopedClients = jest.fn().mockResolvedValue({
    getEventSearchClient: jest.fn().mockReturnValue({}),
    getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures, getQueryLinks }),
    getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
    licensing: {},
  });
  return createEventsWriteTool({
    getScopedClients: getScopedClients as unknown as GetScopedClients,
    server: {} as SignificantEventsServer,
    logger,
    telemetry: telemetry as never,
  });
};

describe('events_write tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFeatures.mockResolvedValue({ hits: [] });
    getQueryLinks.mockResolvedValue([]);
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (assertCanManageSignificantEvents as jest.Mock).mockResolvedValue(undefined);
  });

  it('enforces the batch bounds', () => {
    const missingItems = eventsWriteSchema.safeParse({});
    const emptyItems = eventsWriteSchema.safeParse({ items: [] });

    expect(missingItems.success).toBe(false);
    expect(emptyItems.success).toBe(false);
    if (!missingItems.success) {
      expect(missingItems.error.issues[0].message).toContain(
        'Pass items as a non-empty array of event objects.'
      );
    }
    if (!emptyItems.success) {
      expect(emptyItems.error.issues[0].message).toContain(
        'Pass items as a non-empty array of event objects.'
      );
    }
    expect(
      eventsWriteSchema.safeParse({
        items: Array.from({ length: MAX_BULK_WRITE_ITEMS + 1 }, () => input),
      }).success
    ).toBe(false);
  });

  it('rejects input without an items array', () => {
    expect(eventsWriteSchema.safeParse(input).success).toBe(false);
  });

  it('rejects duplicate detection rules anywhere in a write', () => {
    const signal: SignalEntry = {
      type: 'detection',
      stream_name: 'logs.test',
      description: 'Found: error. Impact: requests failed.',
      verdict: 'confirms',
      evidence: { esql_query: 'FROM logs.test', result: 'found' },
      metadata: {
        rule_uuid: 'rule-1',
        detection_id: 'detection-1',
        change_point_type: 'spike',
        p_value: 0.01,
      },
    };

    const duplicateAcrossItems = eventsWriteSchema.safeParse({
      items: [
        { ...input, signals: [signal] },
        { ...input, signals: [signal] },
      ],
    });
    const duplicateWithinItem = eventsWriteSchema.safeParse({
      items: [{ ...input, signals: [signal, signal] }],
    });

    [duplicateAcrossItems, duplicateWithinItem].forEach((result) => {
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.at(-1)?.message).toBe(
          'Each detection rule UUID may appear exactly once in the complete write, including within a single event item. Correct ownership before the single write; never retry with an empty placeholder.'
        );
      }
    });
  });

  it('rejects mixing confirms and not_checked on the same item', () => {
    const confirmsSignal: SignalEntry = {
      type: 'detection',
      stream_name: 'logs.test',
      description: 'Found: matching failure logs at similar pre/post rates. Impact: not new.',
      verdict: 'confirms',
      evidence: { esql_query: 'FROM logs.test', result: 'found' },
      metadata: {
        rule_uuid: 'rule-1',
        detection_id: 'detection-1',
        change_point_type: 'spike',
        p_value: 0.01,
      },
    };
    const quiet: SignalEntry = {
      type: 'detection',
      stream_name: 'logs.test',
      description: 'Rule Y: no backed query KI matched this detection.',
      verdict: 'not_checked',
      metadata: {
        rule_uuid: 'rule-2',
        detection_id: 'detection-2',
        change_point_type: 'spike',
        p_value: 0.2,
      },
    };
    const result = eventsWriteSchema.safeParse({
      items: [{ ...input, signals: [confirmsSignal, quiet] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.at(-1)?.message).toContain('cannot include not_checked');
    }
  });

  it('normalizes an empty event_id to an omitted event_id', () => {
    const result = eventsWriteSchema.parse({
      items: [{ ...input, event_id: '' }],
    });

    expect(result.items[0].event_id).toBeUndefined();
  });

  it('accepts only discovery as the optional caller source', () => {
    expect(eventsWriteSchema.safeParse({ source: 'discovery', items: [input] }).success).toBe(true);
    expect(eventsWriteSchema.safeParse({ source: 'investigation', items: [input] }).success).toBe(
      false
    );
  });

  it.each<{
    label: string;
    stack: RunContextStackEntry[];
    expected: boolean;
  }>([
    {
      label: 'the discovery agent',
      stack: [{ type: 'agent', agentId: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID }],
      expected: true,
    },
    {
      label: 'a different agent',
      stack: [{ type: 'agent', agentId: 'another-agent' }],
      expected: false,
    },
    { label: 'no agent', stack: [], expected: false },
  ])(
    'sets rejectUnknownEventIds from trusted run context for $label',
    async ({ stack, expected }) => {
      (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
        {
          index: 0,
          event_uuid: 'uuid-1',
          event_id: 'event-1',
          status: 'open',
          written: true,
        },
      ]);
      const context = createMockToolContext();
      context.runContext.stack = stack;

      await invokeHandler(
        createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
        { source: 'discovery', items: [input] },
        context
      );

      expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'discovery', rejectUnknownEventIds: expected })
      );
    }
  );

  describe('severity_score resolution', () => {
    const detectionSignal = (ruleUuid: string, severityScore?: number): SignalEntry => ({
      type: 'detection',
      stream_name: 'logs.test',
      description: 'Found: connection refused. Impact: checkout requests blocked.',
      verdict: 'confirms',
      impact: 'blocked',
      evidence: { esql_query: 'FROM logs.test', result: 'found' },
      metadata: {
        rule_uuid: ruleUuid,
        detection_id: `${ruleUuid}-det`,
        change_point_type: 'spike',
        p_value: 0.01,
        ...(severityScore !== undefined ? { severity_score: severityScore } : {}),
      },
    });

    const writtenSignals = (): SignalEntry[] =>
      (eventsWriteBulkHandler as jest.Mock).mock.calls[0][0].inputs[0].signals;

    beforeEach(() => {
      (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
        { index: 0, event_uuid: 'uuid-1', event_id: 'event-1', status: 'active', written: true },
      ]);
    });

    it('stamps each detection signal with its backing KI score, replacing any caller value', async () => {
      getQueryLinks.mockResolvedValue([
        {
          rule_id: 'rule-1',
          stream_name: 'logs.test',
          rule_backed: true,
          query: { severity_score: 80 },
        },
        {
          rule_id: 'rule-2',
          stream_name: 'logs.test',
          rule_backed: true,
          query: { severity_score: 65 },
        },
      ]);

      await invokeHandler(
        createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
        {
          source: 'discovery',
          items: [
            { ...input, signals: [detectionSignal('rule-1', 10), detectionSignal('rule-2')] },
          ],
        },
        createMockToolContext()
      );

      expect(getQueryLinks).toHaveBeenCalledWith(['logs.test'], {
        ruleIds: ['rule-1', 'rule-2'],
        includeExpired: true,
      });
      expect(writtenSignals().map((signal) => signal.metadata?.severity_score)).toEqual([80, 65]);
    });

    it('clears a caller-supplied score when the rule has no scored KI, and warns', async () => {
      const logger = loggingSystemMock.createLogger();
      getQueryLinks.mockResolvedValue([]);

      await invokeHandler(
        createTool({ trackAgentToolEventsWrite: jest.fn() }, logger) as never,
        { source: 'discovery', items: [{ ...input, signals: [detectionSignal('rule-1', 95)] }] },
        createMockToolContext()
      );

      expect(writtenSignals()[0].metadata?.severity_score).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rule-1'));
    });

    it('does not consult the KI store when no item carries a detection signal', async () => {
      await invokeHandler(
        createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
        { source: 'discovery', items: [input] },
        createMockToolContext()
      );

      expect(getQueryLinks).not.toHaveBeenCalled();
    });

    it('fails loudly when the KI lookup fails', async () => {
      getQueryLinks.mockRejectedValue(new Error('ki index unavailable'));

      const result = await invokeHandler(
        createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
        { source: 'discovery', items: [{ ...input, signals: [detectionSignal('rule-1')] }] },
        createMockToolContext()
      );

      expect(JSON.stringify(result)).toContain(
        'could not resolve severity_score against Knowledge Indicators: ki index unavailable'
      );
      expect(eventsWriteBulkHandler).not.toHaveBeenCalled();
    });
  });

  it('enriches causal features from their Knowledge Indicators', async () => {
    getFeatures.mockImplementation((_streams, options) => {
      const hits =
        'featureIds' in (options ?? {})
          ? [
              {
                id: 'checkout-api',
                uuid: 'uuid-checkout',
                stream_name: 'logs.test',
                type: 'entity',
                subtype: 'service',
              },
            ]
          : [
              {
                id: 'other-api',
                uuid: 'other-feature-uuid',
                stream_name: 'logs.test',
                type: 'technology',
                subtype: 'web_server',
              },
            ];
      return Promise.resolve({ hits });
    });
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        event_uuid: 'uuid-1',
        event_id: 'event-1',
        status: 'open',
        written: true,
      },
    ]);

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      {
        source: 'discovery',
        items: [
          {
            ...input,
            causal_features: [
              {
                feature_id: 'checkout-api',
                name: 'Checkout API',
                stream_name: 'logs.test',
              },
              {
                feature_id: 'other-api',
                name: 'Other API',
                stream_name: 'logs.test',
              },
            ],
            blast_radius: [
              {
                type: 'entity' as const,
                feature_id: 'checkout-api',
                name: 'Checkout API',
                stream_name: 'logs.test',
              },
            ],
          },
        ],
      },
      createMockToolContext()
    );

    expect(getFeatures).toHaveBeenCalledWith(['logs.test'], {
      featureIds: ['checkout-api', 'other-api'],
      includeExcluded: true,
      includeExpired: true,
    });
    expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventSearchClient: {},
        source: 'discovery',
        inputs: [
          expect.objectContaining({
            causal_features: [
              expect.objectContaining({
                feature_id: 'checkout-api',
                type: 'entity',
                subtype: 'service',
              }),
              expect.objectContaining({
                feature_id: 'other-api',
                type: 'technology',
                subtype: 'web_server',
              }),
            ],
            blast_radius: [
              expect.objectContaining({
                feature_id: 'checkout-api',
                type: 'entity',
                subtype: 'service',
              }),
            ],
          }),
        ],
      })
    );
    expect(assertCanManageSignificantEvents).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() })
    );
  });

  it('disambiguates stream-less causal features using the event streams', async () => {
    getFeatures.mockResolvedValue({
      hits: [
        {
          id: 'uuid-web',
          uuid: 'uuid-web',
          stream_name: 'logs.web',
          type: 'entity',
          subtype: 'service',
        },
        {
          id: 'uuid-web',
          uuid: 'uuid-batch',
          stream_name: 'logs.batch',
          type: 'technology',
          subtype: 'web_server',
        },
      ],
    });
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      { index: 0, event_uuid: 'u', event_id: 'e', status: 'open', written: true },
    ]);

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      {
        items: [
          {
            ...input,
            stream_names: ['logs.batch'],
            causal_features: [{ feature_id: 'uuid-web', name: 'Ambiguous' }],
          },
        ],
      },
      createMockToolContext()
    );

    expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventSearchClient: {},
        inputs: [
          expect.objectContaining({
            causal_features: [
              expect.objectContaining({ type: 'technology', subtype: 'web_server' }),
            ],
          }),
        ],
      })
    );
  });

  it('fails the write when the Knowledge Indicator lookup fails, rather than writing unchecked topology', async () => {
    getFeatures.mockRejectedValue(new Error('ki index unavailable'));
    const causalFeatures = [{ feature_id: 'checkout-api', name: 'Checkout API' }];

    const result = await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      { items: [{ ...input, causal_features: causalFeatures }] },
      createMockToolContext()
    );

    expect(eventsWriteBulkHandler).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).toContain('could not resolve topology');
  });

  it('drops topology entries whose feature_id resolves to no stored Knowledge Indicator', async () => {
    getFeatures.mockResolvedValue({
      hits: [
        {
          id: 'checkout-api',
          uuid: 'uuid-checkout',
          stream_name: 'logs.test',
          type: 'entity',
          subtype: 'service',
        },
      ],
    });
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      { index: 0, event_uuid: 'u', event_id: 'e', status: 'open', written: true },
    ]);

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      {
        items: [
          {
            ...input,
            causal_features: [
              { feature_id: 'checkout-api', name: 'Checkout API' },
              { feature_id: 'made-up-service', name: 'Made Up' },
            ],
            blast_radius: [{ type: 'entity', feature_id: 'made-up-db', name: 'Made Up DB' }],
          },
        ],
      },
      createMockToolContext()
    );

    expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: [
          expect.objectContaining({
            causal_features: [
              expect.objectContaining({ feature_id: 'checkout-api', subtype: 'service' }),
            ],
            blast_radius: [],
          }),
        ],
      })
    );
  });

  it('stores the ends of a dependency as the feature_id of their entity Knowledge Indicators', async () => {
    const feature = (id: string, type: string) => ({
      id,
      uuid: `uuid-${id}`,
      stream_name: 'logs.test',
      type,
      subtype: 'service',
    });
    getFeatures.mockResolvedValue({
      hits: [
        feature('gateway', 'entity'),
        feature('checkout', 'entity'),
        feature('gateway-checkout', 'dependency'),
      ],
    });
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      { index: 0, event_uuid: 'u', event_id: 'e', status: 'open', written: true },
    ]);

    const logger = loggingSystemMock.createLogger();

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }, logger) as never,
      {
        items: [
          {
            ...input,
            blast_radius: [
              {
                type: 'dependency',
                feature_id: 'gateway-checkout',
                source: 'uuid-gateway',
                target: 'checkout',
              },
              {
                type: 'dependency',
                feature_id: 'gateway-checkout',
                source: 'checkout',
                target: 'not-a-known-entity',
              },
            ],
          },
        ],
      },
      createMockToolContext()
    );

    expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: [
          expect.objectContaining({
            blast_radius: [
              expect.objectContaining({ source: 'gateway', target: 'checkout' }),
              expect.objectContaining({ source: 'checkout', target: 'not-a-known-entity' }),
            ],
          }),
        ],
      })
    );

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not-a-known-entity'));
  });

  it('resolves the ends of a dependency across streams, and never to another dependency', async () => {
    getFeatures.mockResolvedValue({
      hits: [
        {
          id: 'gateway',
          uuid: 'uuid-gateway',
          stream_name: 'logs.a',
          type: 'entity',
          subtype: 'service',
        },
        {
          id: 'checkout',
          uuid: 'uuid-checkout',
          stream_name: 'logs.b',
          type: 'entity',
          subtype: 'service',
        },
        {
          id: 'other-edge',
          uuid: 'uuid-other-edge',
          stream_name: 'logs.a',
          type: 'dependency',
          subtype: 'http',
        },
        {
          id: 'gateway-checkout',
          uuid: 'uuid-gc',
          stream_name: 'logs.a',
          type: 'dependency',
          subtype: 'http',
        },
      ],
    });
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      { index: 0, event_uuid: 'u', event_id: 'e', status: 'open', written: true },
    ]);
    const logger = loggingSystemMock.createLogger();

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }, logger) as never,
      {
        items: [
          {
            ...input,
            stream_names: ['logs.a', 'logs.b'],
            blast_radius: [
              {
                type: 'dependency',
                feature_id: 'gateway-checkout',
                stream_name: 'logs.a',
                source: 'gateway',
                target: 'checkout',
              },
              {
                type: 'dependency',
                feature_id: 'gateway-checkout',
                stream_name: 'logs.a',
                source: 'gateway',
                target: 'other-edge',
              },
            ],
          },
        ],
      },
      createMockToolContext()
    );

    expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: [
          expect.objectContaining({
            blast_radius: [
              expect.objectContaining({ source: 'gateway', target: 'checkout' }),
              expect.objectContaining({ source: 'gateway', target: 'other-edge' }),
            ],
          }),
        ],
      })
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('other-edge'));
  });

  it('returns aligned results and tracks each item', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        event_uuid: 'uuid-1',
        event_id: 'event-1',
        status: 'open',
        written: true,
      },
      {
        index: 1,
        event_id: 'event-2',
        status: 'closed',
        written: false,
        reason: 'bulk_error',
        error: { type: 'rejected', reason: 'busy', status: 429 },
      },
    ]);
    const telemetry = { trackAgentToolEventsWrite: jest.fn() };
    const result = await invokeHandler(
      createTool(telemetry) as never,
      { items: [input, { ...input, event_id: 'event-2', status: 'closed' }] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({
        results: [expect.objectContaining({ type: 'other', data: { results: expect.any(Array) } })],
      })
    );
    expect(telemetry.trackAgentToolEventsWrite).toHaveBeenCalledTimes(2);
    expect(telemetry.trackAgentToolEventsWrite).toHaveBeenLastCalledWith(
      expect.objectContaining({ success: false, written: false, error_message: 'busy' })
    );
  });

  it('does not replace successful results when telemetry throws', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        event_uuid: 'uuid-1',
        event_id: 'event-1',
        status: 'open',
        written: true,
      },
    ]);
    const telemetry = {
      trackAgentToolEventsWrite: jest.fn().mockImplementation(() => {
        throw new Error('telemetry unavailable');
      }),
    };

    const result = await invokeHandler(
      createTool(telemetry) as never,
      { items: [input] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({ results: [expect.objectContaining({ type: 'other' })] })
    );
  });

  it('returns a classified validation error', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockRejectedValue(
      new BulkWriteError('validation_error', 'duplicate event_id')
    );
    const result = await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      { items: [input] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({
        results: [
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({ code: 'validation_error', retryable: false }),
          }),
        ],
      })
    );
  });
});

describe('eventsWriteItemSchema', () => {
  const validItem = {
    status: 'active',
    stream_names: ['logs.test'],
    title: 'Test event',
    symptom_hypothesis: 'Requests are delayed because a dependency is timing out.',
    summary: 'P99 latency breached SLO',
    confidence: 0.82,
    assessment_note: 'Verified via execute_esql',
    causal_features: [],
    blast_radius: [],
    signals: [
      {
        type: 'detection',
        stream_name: 'logs.test',
        description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH),
        verdict: 'not_checked',
        metadata: {
          detection_id: 'det-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      },
    ],
  };

  it('accepts a valid item at the field length boundaries', () => {
    expect(eventsWriteItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('strips a legacy severity field instead of rejecting the item', () => {
    const result = eventsWriteItemSchema.safeParse({
      ...validItem,
      severity: 'critical',
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('severity');
      expect(result.data.confidence).toBe(0.9);
    }
  });

  it.each([
    [
      'signal description',
      {
        signals: [
          { ...validItem.signals[0], description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH + 1) },
        ],
      },
    ],
    ['symptom_hypothesis', { symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1) }],
    ['summary', { summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1) }],
    ['assessment_note', { assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1) }],
  ])('rejects %s exceeding the length limit', (_, overrides) => {
    expect(eventsWriteItemSchema.safeParse({ ...validItem, ...overrides }).success).toBe(false);
  });
});
