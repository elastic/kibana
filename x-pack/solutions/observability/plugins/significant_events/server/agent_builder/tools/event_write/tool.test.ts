/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContextStackEntry } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from '../../agents/discovery/discovery';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import { BulkWriteError, MAX_BULK_WRITE_ITEMS } from '../bulk_write';
import { eventsWriteBulkHandler } from './handler';
import { createEventsWriteTool, eventsWriteSchema } from './tool';
import type { SignalEntry } from '@kbn/significant-events-schema';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('../../../routes/utils/assert_can_manage_significant_events', () => ({
  assertCanManageSignificantEvents: jest.fn(),
}));

jest.mock('./handler', () => ({
  eventsWriteBulkHandler: jest.fn(),
}));

const confirmingSignal: SignalEntry = {
  type: 'detection',
  stream_name: 'logs.test',
  description: 'Found: error. Impact: requests failed.',
  verdict: 'confirms',
  evidence: { esql_query: 'FROM logs.test', result: 'found' },
  metadata: {
    rule_uuid: 'rule-input',
    detection_id: 'detection-input',
    change_point_type: 'spike',
    p_value: 0.01,
  },
};

const input = {
  event_id: 'event-1',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: 'high' as const,
  confidence: 0.8,
  signals: [confirmingSignal],
};

const getFeatures = jest.fn().mockResolvedValue({ hits: [] });

const createTool = (telemetry: { trackAgentToolEventsWrite: jest.Mock }) => {
  const getScopedClients = jest.fn().mockResolvedValue({
    getEventSearchClient: jest.fn().mockReturnValue({}),
    getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures }),
    getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
    licensing: {},
  });
  return createEventsWriteTool({
    getScopedClients: getScopedClients as unknown as GetScopedClients,
    server: {} as SignificantEventsServer,
    logger: loggingSystemMock.createLogger(),
    telemetry: telemetry as never,
  });
};

describe('events_write tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFeatures.mockResolvedValue({ hits: [] });
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
    const signal = {
      type: 'detection' as const,
      stream_name: 'logs.test',
      description: 'Found: error. Impact: requests failed.',
      verdict: 'confirms',
      evidence: { esql_query: 'FROM logs.test', result: 'found' },
      metadata: {
        rule_uuid: 'rule-1',
        detection_id: 'detection-1',
        change_point_type: 'spike' as const,
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

  describe('breaching signal invariant', () => {
    const signalWith = (verdict: string) => ({
      type: 'detection' as const,
      stream_name: 'logs.test',
      description: 'Found: matching failure logs at similar pre/post rates. Impact: not new.',
      verdict,
      evidence: { esql_query: 'FROM logs.test', result: 'found' },
      metadata: {
        rule_uuid: 'rule-1',
        detection_id: 'detection-1',
        change_point_type: 'spike' as const,
        p_value: 0.01,
      },
    });
    const quiet = {
      type: 'detection' as const,
      stream_name: 'logs.test',
      description: 'Rule X: no backed query KI matched this detection.',
      verdict: 'not_checked' as const,
      metadata: {
        rule_uuid: 'rule-2',
        detection_id: 'detection-2',
        change_point_type: 'spike' as const,
        p_value: 0.2,
      },
    };
    const { event_id: _omitted, ...newEventInput } = input;

    it.each([
      ['inconclusive evidence', [signalWith('inconclusive')]],
      ['refuting evidence', [signalWith('refutes')]],
      ['a quiet not_checked rule', [quiet]],
      ['no signals at all', []],
    ])('rejects a new event backed only by %s', (_label, signals) => {
      const result = eventsWriteSchema.safeParse({ items: [{ ...newEventInput, signals }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.at(-1)?.message).toContain('at least one confirms signal');
      }
    });

    it('rejects a continuation with no breaching signal', () => {
      const result = eventsWriteSchema.safeParse({
        items: [{ ...input, signals: [signalWith('inconclusive')] }],
      });

      expect(result.success).toBe(false);
    });

    it('accepts an item backed by a confirms signal, new or continuation', () => {
      expect(
        eventsWriteSchema.safeParse({
          items: [{ ...newEventInput, signals: [signalWith('confirms')] }],
        }).success
      ).toBe(true);
      expect(
        eventsWriteSchema.safeParse({ items: [{ ...input, signals: [signalWith('confirms')] }] })
          .success
      ).toBe(true);
    });

    it('accepts an item whose only grounded signal is off_topic (observed-error path)', () => {
      expect(
        eventsWriteSchema.safeParse({ items: [{ ...input, signals: [signalWith('off_topic')] }] })
          .success
      ).toBe(true);
    });

    it('rejects mixing confirms and not_checked on the same item', () => {
      const result = eventsWriteSchema.safeParse({
        items: [{ ...input, signals: [signalWith('confirms'), quiet] }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.at(-1)?.message).toContain('cannot include not_checked');
      }
    });

    it('rejects a status from the caller instead of dropping it, so an attempt to close fails loudly', () => {
      const result = eventsWriteSchema.safeParse({
        items: [{ ...input, status: 'inactive' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map(({ message }) => message).join(' ')).toContain(
          'status is not an input'
        );
      }
    });
  });

  it('normalizes an empty event_id to an omitted event_id', () => {
    const result = eventsWriteSchema.parse({
      items: [{ ...input, event_id: '' }],
    });

    expect(result.items[0].event_id).toBeUndefined();
  });

  it('accepts medium for known-ongoing events', () => {
    const result = eventsWriteSchema.safeParse({
      items: [{ ...input, severity: 'medium' }],
    });

    expect(result.success).toBe(true);
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

  it('writes unenriched causal features when the lookup fails', async () => {
    getFeatures.mockRejectedValue(new Error('ki index unavailable'));
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      { index: 0, event_uuid: 'u', event_id: 'e', status: 'open', written: true },
    ]);
    const causalFeatures = [{ feature_id: 'checkout-api', name: 'Checkout API' }];

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      { items: [{ ...input, causal_features: causalFeatures }] },
      createMockToolContext()
    );

    expect(eventsWriteBulkHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventSearchClient: {},
        inputs: [expect.objectContaining({ causal_features: causalFeatures })],
      })
    );
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

  it('writes every item as active', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      { index: 0, event_id: 'event-1', status: 'active', written: true },
    ]);

    await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      { items: [{ ...input, status: 'inactive' }] },
      createMockToolContext()
    );

    const [{ inputs }] = (eventsWriteBulkHandler as jest.Mock).mock.calls[0];
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ event_id: 'event-1', status: 'active' });
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
