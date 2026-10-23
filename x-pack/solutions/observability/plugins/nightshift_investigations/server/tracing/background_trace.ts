/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import {
  context as otelContext,
  propagation,
  SpanKind,
  trace,
  TraceFlags,
  type Attributes,
  type Link,
  type Span,
  type SpanContext,
} from '@opentelemetry/api';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import {
  loadTracingPrivacySettings,
  withAgentBuilderContext,
  type TracingPrivacySettings,
} from '@kbn/agent-builder-plugin/server';
import {
  BAGGAGE_TRACKING_BEACON_KEY,
  BAGGAGE_TRACKING_BEACON_VALUE,
  ElasticGenAIAttributes,
  GenAISemanticConventions,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';

const ZERO_TRACE_ID = '00000000000000000000000000000000';
const ZERO_SPAN_ID = '0000000000000000';

export const DEFAULT_BACKGROUND_PRIVACY_SETTINGS: TracingPrivacySettings = {
  enabled: true,
  includeUserPrompts: false,
  includeLlmResponses: false,
  includeToolDetails: false,
  includeSystemPrompt: false,
  includeRealNames: false,
  includeRealIds: false,
  includeUserData: false,
};

export const isValidOtelTraceId = (value: string | undefined): value is string =>
  typeof value === 'string' && /^[0-9a-f]{32}$/.test(value) && value !== ZERO_TRACE_ID;

export const isValidOtelSpanId = (value: string | undefined): value is string =>
  typeof value === 'string' && /^[0-9a-f]{16}$/.test(value) && value !== ZERO_SPAN_ID;

/**
 * Derives a deterministic 32-hex OpenTelemetry trace ID from a workflow execution UUID
 * (stripping hyphens when the input is a UUID, or SHA-256 hashing arbitrary strings).
 */
export const toDeterministicTraceId = (seed: string | undefined): string | undefined => {
  if (!seed || seed.trim().length === 0) {
    return undefined;
  }
  const compact = seed.trim().replace(/-/g, '').toLowerCase();
  if (isValidOtelTraceId(compact)) {
    return compact;
  }
  const hashed = crypto.createHash('sha256').update(seed.trim()).digest('hex').slice(0, 32);
  return hashed === ZERO_TRACE_ID ? '10000000000000000000000000000000' : hashed;
};

/**
 * Derives a deterministic 16-hex OpenTelemetry span ID from a seed string so workflow steps
 * running across separate Task Manager workers can parent under a shared phase or root span.
 */
export const toDeterministicSpanId = (seed: string): string => {
  const hashed = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return hashed === ZERO_SPAN_ID ? '1000000000000000' : hashed;
};

export interface NightshiftBackgroundSpanOptions {
  name: string;
  /** Deterministic 32-hex `background_trace_id` (or UUID seed). Falls back to `workflowExecutionId`. */
  traceId?: string;
  /** Optional 16-hex parent span ID. Defaults to deterministic `nightshift.background` root span ID. */
  parentSpanId?: string;
  /** Foreground investigator round `trace_id` (`T_foreground`) for cross-trace correlation. */
  foregroundTraceId?: string;
  roundId?: string;
  conversationId?: string;
  spaceId: string;
  workflowExecutionId?: string;
  attributes?: Attributes;
  request?: KibanaRequest;
  getSavedObjects?: () => CoreStart['savedObjects'] | undefined;
  getUiSettings?: () => CoreStart['uiSettings'] | undefined;
  privacySettings?: TracingPrivacySettings;
  logger?: {
    debug?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
  };
}

const resolvePrivacySettings = async (
  options: NightshiftBackgroundSpanOptions
): Promise<TracingPrivacySettings> => {
  if (options.privacySettings) {
    return options.privacySettings;
  }
  const uiSettings = options.getUiSettings?.();
  const savedObjects = options.getSavedObjects?.();
  if (
    uiSettings &&
    savedObjects &&
    options.request &&
    typeof uiSettings.asScopedToClient === 'function'
  ) {
    const scopedSoClient = savedObjects.getScopedClient?.(options.request);
    if (scopedSoClient) {
      return loadTracingPrivacySettings({
        uiSettingsClient: uiSettings.asScopedToClient(scopedSoClient),
        logger: (options.logger ?? { error: () => {} }) as never,
        spaceId: options.spaceId,
      });
    }
  }
  return DEFAULT_BACKGROUND_PRIVACY_SETTINGS;
};

/**
 * Wraps a Nightshift background workflow step (`materialize`, `optimize`, `decisionTreeReinforce`,
 * or scheduled judges) in an OpenTelemetry span on `T_background` (`background_trace_id`).
 *
 * Sets both `withAgentBuilderContext` (so `AgentBuilderSpanProcessor` exports the span to
 * `traces-agent_builder.otel-<spaceId>`) and `BAGGAGE_TRACKING_BEACON_KEY` + a remote parent
 * `SpanContext` (so `@kbn/inference-tracing`'s `createInferenceContext` preserves `T_background`
 * as the parent trace rather than resetting to a new root trace).
 */
export const withNightshiftBackgroundSpan = async <T>(
  options: NightshiftBackgroundSpanOptions,
  fn: (span?: Span) => Promise<T>
): Promise<T> => {
  const resolvedTraceId = toDeterministicTraceId(options.traceId ?? options.workflowExecutionId);
  if (!resolvedTraceId) {
    return fn(undefined);
  }

  const privacySettings = await resolvePrivacySettings(options);
  if (!privacySettings.enabled) {
    return fn(undefined);
  }

  const resolvedParentSpanId =
    options.parentSpanId && isValidOtelSpanId(options.parentSpanId)
      ? options.parentSpanId
      : toDeterministicSpanId(`${resolvedTraceId}:nightshift.background`);

  const foregroundTraceId = toDeterministicTraceId(options.foregroundTraceId);
  const links: Link[] =
    foregroundTraceId && isValidOtelTraceId(foregroundTraceId)
      ? [
          {
            context: {
              traceId: foregroundTraceId,
              spanId: toDeterministicSpanId(`${foregroundTraceId}:foreground`),
              traceFlags: TraceFlags.SAMPLED,
              isRemote: true,
            },
            attributes: {
              'nightshift.link_type': 'foreground_round',
              ...(options.roundId ? { 'nightshift.round_id': options.roundId } : {}),
            },
          },
        ]
      : [];

  return withAgentBuilderContext(
    () => {
      const activeCtx = otelContext.active();
      const currentBaggage = propagation.getBaggage(activeCtx) ?? propagation.createBaggage();
      const baggageWithBeacon = currentBaggage.setEntry(BAGGAGE_TRACKING_BEACON_KEY, {
        value: BAGGAGE_TRACKING_BEACON_VALUE,
      });
      const ctxWithBeacon = propagation.setBaggage(activeCtx, baggageWithBeacon);
      const remoteParent: SpanContext = {
        traceId: resolvedTraceId,
        spanId: resolvedParentSpanId,
        traceFlags: TraceFlags.SAMPLED,
        isRemote: true,
      };
      const ctxWithParent = trace.setSpanContext(ctxWithBeacon, remoteParent);

      return otelContext.with(ctxWithParent, () =>
        withActiveInferenceSpan(
          options.name,
          {
            kind: SpanKind.INTERNAL,
            ...(links.length > 0 ? { links } : {}),
            attributes: {
              [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
              [GenAISemanticConventions.GenAIOperationName]: 'invoke_workflow',
              'nightshift.background_trace_id': resolvedTraceId,
              ...(foregroundTraceId ? { 'nightshift.foreground_trace_id': foregroundTraceId } : {}),
              ...(options.conversationId
                ? { 'nightshift.conversation_id': options.conversationId }
                : {}),
              ...(options.roundId ? { 'nightshift.round_id': options.roundId } : {}),
              ...(options.workflowExecutionId
                ? { 'nightshift.workflow_execution_id': options.workflowExecutionId }
                : {}),
              ...options.attributes,
            },
          },
          (span) => Promise.resolve(fn(span))
        )
      );
    },
    {
      spaceId: options.spaceId,
      conversationId: options.conversationId,
      privacySettings,
    }
  );
};
