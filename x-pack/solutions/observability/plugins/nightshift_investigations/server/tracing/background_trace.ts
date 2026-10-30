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
  type AttributeValue,
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

const DISABLED_PRIVACY_SETTINGS: TracingPrivacySettings = {
  ...DEFAULT_BACKGROUND_PRIVACY_SETTINGS,
  enabled: false,
};

export const isValidOtelTraceId = (value: string | undefined): value is string =>
  typeof value === 'string' && /^[0-9a-f]{32}$/.test(value) && value !== ZERO_TRACE_ID;

export const isValidOtelSpanId = (value: string | undefined): value is string =>
  typeof value === 'string' && /^[0-9a-f]{16}$/.test(value) && value !== ZERO_SPAN_ID;

/**
 * Derives an opaque deterministic 32-hex OpenTelemetry trace ID from a workflow execution UUID
 * or arbitrary seed string. Already-derived 32-hex trace IDs are returned unchanged so downstream
 * steps join the same `T_background` trace without exposing the raw execution UUID.
 */
export const toDeterministicTraceId = (seed: string | undefined): string | undefined => {
  if (!seed || seed.trim().length === 0) {
    return undefined;
  }
  const trimmed = seed.trim().toLowerCase();
  if (isValidOtelTraceId(trimmed)) {
    return trimmed;
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

const hashSensitiveId = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);

const SENSITIVE_ID_ATTR_KEYS = new Set<string>([
  'nightshift.conversation_id',
  'nightshift.reinforcement_conversation_id',
  'nightshift.round_id',
  'nightshift.workflow_execution_id',
]);

/**
 * Applies `TracingPrivacySettings` to `nightshift.*` custom attributes before recording on a span:
 * - When `includeRealIds` is false, hashes conversation, round, and workflow execution IDs.
 * - When `includeLlmResponses` or `includeToolDetails` is false, strips `before_content` and
 *   `after_content` from `nightshift.applied_writes` while keeping store/id/action/version metadata.
 */
export const sanitizeNightshiftAttributeValue = (
  key: string,
  value: AttributeValue | undefined,
  privacySettings: TracingPrivacySettings
): AttributeValue | undefined => {
  if (typeof value !== 'string') {
    return value;
  }
  if (!privacySettings.includeRealIds && SENSITIVE_ID_ATTR_KEYS.has(key) && value.length > 0) {
    return hashSensitiveId(value);
  }
  if (
    key === 'nightshift.applied_writes' &&
    (!privacySettings.includeLlmResponses || !privacySettings.includeToolDetails)
  ) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const redacted = parsed.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return entry;
          }
          const {
            before_content: _beforeContent,
            after_content: _afterContent,
            ...metadataOnly
          } = entry as Record<string, unknown>;
          return metadataOnly;
        });
        return JSON.stringify(redacted);
      }
    } catch {
      return '[]';
    }
  }
  return value;
};

const sanitizeAttributesObject = (
  attrs: Attributes,
  privacySettings: TracingPrivacySettings
): Attributes => {
  const out: Attributes = {};
  for (const [key, value] of Object.entries(attrs)) {
    out[key] = sanitizeNightshiftAttributeValue(key, value, privacySettings);
  }
  return out;
};

const createPrivacyFilteredSpan = (span: Span, privacySettings: TracingPrivacySettings): Span =>
  new Proxy(span, {
    get(target, prop, receiver) {
      if (prop === 'setAttribute') {
        return (key: string, value: AttributeValue) => {
          const sanitized = sanitizeNightshiftAttributeValue(key, value, privacySettings);
          if (sanitized !== undefined) {
            target.setAttribute(key, sanitized);
          }
          return receiver;
        };
      }
      if (prop === 'setAttributes') {
        return (attrs: Attributes) => {
          target.setAttributes(sanitizeAttributesObject(attrs, privacySettings));
          return receiver;
        };
      }
      const val = Reflect.get(target, prop, target);
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });

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
  // Fail closed when privacy settings cannot be resolved for the target space.
  return DISABLED_PRIVACY_SETTINGS;
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
  const rawRoundAttr = sanitizeNightshiftAttributeValue(
    'nightshift.round_id',
    options.roundId,
    privacySettings
  );
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
              ...(rawRoundAttr ? { 'nightshift.round_id': rawRoundAttr } : {}),
            },
          },
        ]
      : [];

  const initialAttributes = sanitizeAttributesObject(
    {
      [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      [GenAISemanticConventions.GenAIOperationName]: 'invoke_workflow',
      'nightshift.background_trace_id': resolvedTraceId,
      ...(foregroundTraceId ? { 'nightshift.foreground_trace_id': foregroundTraceId } : {}),
      ...(options.conversationId ? { 'nightshift.conversation_id': options.conversationId } : {}),
      ...(options.roundId ? { 'nightshift.round_id': options.roundId } : {}),
      ...(options.workflowExecutionId
        ? { 'nightshift.workflow_execution_id': options.workflowExecutionId }
        : {}),
      ...options.attributes,
    },
    privacySettings
  );

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
            attributes: initialAttributes,
          },
          (span) =>
            Promise.resolve(fn(span ? createPrivacyFilteredSpan(span, privacySettings) : undefined))
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
