/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { resources } from '@elastic/opentelemetry-node/sdk';
import { context as otelContext, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  BAGGAGE_TRACKING_BEACON_KEY,
  BAGGAGE_TRACKING_BEACON_VALUE,
  CONVERSATION_ID_BAGGAGE_KEY,
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
} from '@kbn/inference-tracing';
import {
  DEFAULT_BACKGROUND_PRIVACY_SETTINGS,
  isValidOtelSpanId,
  isValidOtelTraceId,
  toDeterministicSpanId,
  toDeterministicTraceId,
  withNightshiftBackgroundSpan,
} from './background_trace';

const SPACE_ID_BAGGAGE_KEY = 'agent_builder.space_id';

describe('server/tracing/background_trace', () => {
  let contextManager: AsyncLocalStorageContextManager;
  const startedSpans: Array<{
    name: string;
    traceId: string;
    attributes: Record<string, unknown>;
  }> = [];

  beforeEach(() => {
    startedSpans.length = 0;
    contextManager = new AsyncLocalStorageContextManager();
    otelContext.setGlobalContextManager(contextManager);
    contextManager.enable();

    const recordingProcessor: tracing.SpanProcessor = {
      onStart: (span) => {
        startedSpans.push({
          name: span.name,
          traceId: span.spanContext().traceId,
          attributes: { ...span.attributes },
        });
      },
      onEnd: () => {},
      forceFlush: async () => {},
      shutdown: async () => {},
    };
    initInferenceTracerProvider({
      processors: [recordingProcessor],
      resource: resources.defaultResource(),
    });
  });

  afterEach(async () => {
    await shutdownInferenceTracerProvider();
    contextManager.disable();
  });

  describe('toDeterministicTraceId & toDeterministicSpanId', () => {
    it('hashes UUIDs and arbitrary strings to an opaque 32-hex traceId and preserves already-derived 32-hex traceIds', () => {
      const fromUuid = toDeterministicTraceId('be01f25c-8dec-495b-a134-6f752bdce9e0');
      expect(isValidOtelTraceId(fromUuid)).toBe(true);
      expect(fromUuid).not.toBe('be01f25c8dec495ba1346f752bdce9e0');
      expect(toDeterministicTraceId(fromUuid)).toBe(fromUuid);

      const fromArbitrary = toDeterministicTraceId('fake_workflow_execution_id');
      expect(isValidOtelTraceId(fromArbitrary)).toBe(true);
      expect(toDeterministicTraceId('fake_workflow_execution_id')).toBe(fromArbitrary);

      expect(toDeterministicTraceId('')).toBeUndefined();
      expect(toDeterministicTraceId(undefined)).toBeUndefined();

      const spanId = toDeterministicSpanId(
        'be01f25c8dec495ba1346f752bdce9e0:nightshift.background'
      );
      expect(isValidOtelSpanId(spanId)).toBe(true);
    });
  });

  describe('withNightshiftBackgroundSpan', () => {
    it('activates AgentBuilderContext, sets inference tracking beacon, and applies privacy filtering on nightshift.* attributes', async () => {
      const backgroundTraceId = 'be01f25c8dec495ba1346f752bdce9e0';
      const foregroundTraceId = 'ebf7677419199e9edc53ac5dc26b9e0e';
      let observedTraceId: string | undefined;
      let observedSpaceBaggage: string | undefined;
      let observedConvBaggage: string | undefined;
      let observedBeaconBaggage: string | undefined;
      let spanAttrWrites: unknown;

      const returnValue = await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.decisionTreeReinforce',
          traceId: backgroundTraceId,
          foregroundTraceId,
          roundId: 'round-1',
          conversationId: 'conv-1',
          spaceId: 'marketing',
          workflowExecutionId: 'exec-1',
          privacySettings: DEFAULT_BACKGROUND_PRIVACY_SETTINGS,
        },
        async (span) => {
          const active = otelContext.active();
          const baggage = propagation.getBaggage(active);
          observedSpaceBaggage = baggage?.getEntry(SPACE_ID_BAGGAGE_KEY)?.value;
          observedConvBaggage = baggage?.getEntry(CONVERSATION_ID_BAGGAGE_KEY)?.value;
          observedBeaconBaggage = baggage?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value;
          observedTraceId = span?.spanContext().traceId ?? trace.getSpanContext(active)?.traceId;
          span?.setAttribute(
            'nightshift.applied_writes',
            JSON.stringify([
              {
                store: 'cortex',
                item_id: 'cortex_service_checkout',
                action: 'upsert',
                before_content: 'secret before',
                after_content: 'secret after',
              },
            ])
          );
          spanAttrWrites = (span as unknown as { attributes?: Record<string, unknown> })
            ?.attributes?.['nightshift.applied_writes'];
          return 'ok';
        }
      );

      expect(returnValue).toBe('ok');
      expect(observedSpaceBaggage).toBe('marketing');
      expect(observedConvBaggage).toBe('conv-1');
      expect(observedBeaconBaggage).toBe(BAGGAGE_TRACKING_BEACON_VALUE);
      expect(observedTraceId).toBe(backgroundTraceId);
      // With default includeRealIds: false, sensitive IDs are hashed (16-hex)
      expect(startedSpans).toEqual([
        expect.objectContaining({
          name: 'nightshift.decisionTreeReinforce',
          traceId: backgroundTraceId,
          attributes: expect.objectContaining({
            'nightshift.background_trace_id': backgroundTraceId,
            'nightshift.foreground_trace_id': foregroundTraceId,
            'nightshift.conversation_id': expect.stringMatching(/^[0-9a-f]{16}$/),
            'nightshift.round_id': expect.stringMatching(/^[0-9a-f]{16}$/),
            'nightshift.workflow_execution_id': expect.stringMatching(/^[0-9a-f]{16}$/),
          }),
        }),
      ]);
      // With default includeLlmResponses: false / includeToolDetails: false, before/after content is stripped
      expect(JSON.parse(String(spanAttrWrites))).toEqual([
        {
          store: 'cortex',
          item_id: 'cortex_service_checkout',
          action: 'upsert',
        },
      ]);
    });

    it('fails closed when neither privacySettings nor uiSettings/savedObjects are supplied, or when privacySettings.enabled is false', async () => {
      let receivedSpanWithoutSettings: unknown = 'not-called';
      const res1 = await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.cortexHydrate',
          traceId: 'be01f25c8dec495ba1346f752bdce9e0',
          spaceId: 'default',
        },
        async (span) => {
          receivedSpanWithoutSettings = span;
          return 'no-settings';
        }
      );
      expect(res1).toBe('no-settings');
      expect(receivedSpanWithoutSettings).toBeUndefined();

      let receivedSpan: unknown = 'not-called';
      const result = await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.memoryOptimize',
          traceId: 'be01f25c8dec495ba1346f752bdce9e0',
          spaceId: 'default',
          privacySettings: {
            ...DEFAULT_BACKGROUND_PRIVACY_SETTINGS,
            enabled: false,
          },
        },
        async (span) => {
          receivedSpan = span;
          return 42;
        }
      );

      expect(result).toBe(42);
      expect(receivedSpan).toBeUndefined();
      expect(startedSpans).toHaveLength(0);
    });
  });
});
