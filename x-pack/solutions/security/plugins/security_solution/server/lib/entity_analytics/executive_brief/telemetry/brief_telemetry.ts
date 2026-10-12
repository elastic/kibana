/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import type {
  Counter,
  Histogram,
  Meter,
  Span,
  UpDownCounter,
  Attributes,
} from '@opentelemetry/api';
import { ValueType, context, createContextKey, metrics } from '@opentelemetry/api';
import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { withActiveSpan } from '@kbn/tracing-utils';
import type { VerificationCheck } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { BriefJobStage } from '../../../../../common/entity_analytics/executive_brief/document';
import type {
  SignalRun,
  SignalStatus,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT } from '../../../telemetry/event_based/events';
import type {
  BriefCompletedEvent,
  BriefRejectionReason,
  BriefSpanName,
  BriefTelemetry,
} from './types';

const METER_SCOPE = 'kibana.entity_analytics.executive_brief';
const SPAN_PREFIX = 'executive_brief';
const SIGNAL_SPAN_NAME = `${SPAN_PREFIX}.signal`;

const metricName = (name: string): string => `${METER_SCOPE}.${name}`;

// Bucket boundaries sized to what each histogram measures; the SDK default tops out too early
// for LLM-bound durations and is far too coarse for token counts.
const GENERATION_DURATION_S_BOUNDARIES = [1, 2.5, 5, 10, 20, 30, 45, 60, 90, 120, 180, 300];
const STAGE_DURATION_S_BOUNDARIES = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 45, 60, 120, 300];
const SIGNAL_DURATION_S_BOUNDARIES = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20];
// SemConv advice for `gen_ai.client.token.usage`.
const TOKEN_BOUNDARIES = [
  1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864,
];

// Attribute shapes extend OTel `Attributes` so they satisfy its index-signature constraint.
interface GenerationAttributes extends Attributes {
  outcome: BriefCompletedEvent['outcome'];
  'error.type'?: string;
}

interface StageAttributes extends Attributes {
  stage: BriefJobStage;
}

interface SignalAttributes extends Attributes {
  'signal.id': string;
  'signal.status': SignalStatus;
}

interface TokenAttributes extends Attributes {
  'gen_ai.token.type': 'input' | 'output';
}

interface DroppedAttributes extends Attributes {
  check: VerificationCheck;
}

interface RejectedAttributes extends Attributes {
  reason: BriefRejectionReason;
}

interface BriefInstruments {
  generationDuration: Histogram<GenerationAttributes>;
  stageDuration: Histogram<StageAttributes>;
  signalDuration: Histogram<SignalAttributes>;
  tokenUsage: Histogram<TokenAttributes>;
  verificationDropped: Counter<DroppedAttributes>;
  active: UpDownCounter;
  rejected: Counter<RejectedAttributes>;
}

const createInstruments = (meter: Meter): BriefInstruments => ({
  generationDuration: meter.createHistogram<GenerationAttributes>(
    metricName('generation.duration'),
    {
      description: 'Duration of executive brief generation jobs, from start to completion.',
      unit: 's',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: GENERATION_DURATION_S_BOUNDARIES },
    }
  ),
  stageDuration: meter.createHistogram<StageAttributes>(metricName('stage.duration'), {
    description: 'Duration of each executive brief stage (gather, compose, verify).',
    unit: 's',
    valueType: ValueType.DOUBLE,
    advice: { explicitBucketBoundaries: STAGE_DURATION_S_BOUNDARIES },
  }),
  signalDuration: meter.createHistogram<SignalAttributes>(metricName('signal.duration'), {
    description: 'Duration of each executive brief signal in the gather stage.',
    unit: 's',
    valueType: ValueType.DOUBLE,
    advice: { explicitBucketBoundaries: SIGNAL_DURATION_S_BOUNDARIES },
  }),
  tokenUsage: meter.createHistogram<TokenAttributes>(metricName('llm.token.usage'), {
    description: 'LLM tokens used per executive brief job, by token type.',
    unit: '{token}',
    valueType: ValueType.INT,
    advice: { explicitBucketBoundaries: TOKEN_BOUNDARIES },
  }),
  verificationDropped: meter.createCounter<DroppedAttributes>(metricName('verification.dropped'), {
    description: 'Brief claims removed by verification, by check.',
    unit: '{claim}',
    valueType: ValueType.INT,
  }),
  active: meter.createUpDownCounter(metricName('active'), {
    description: 'Executive brief generation jobs currently running on this Kibana node.',
    unit: '{job}',
    valueType: ValueType.INT,
  }),
  rejected: meter.createCounter<RejectedAttributes>(metricName('rejected'), {
    description: 'Executive brief generate requests rejected before a job started, by reason.',
    unit: '{request}',
    valueType: ValueType.INT,
  }),
});

// Instruments are created once per process, on first use, so nothing is registered while the
// feature flag is off.
const getInstruments = once(
  (): BriefInstruments => createInstruments(metrics.getMeter(METER_SCOPE))
);

interface ActiveSignalSpan {
  signalId: string;
  span: Span;
}

const SIGNAL_SPAN_KEY = createContextKey(`${METER_SCOPE}.signal_span`);

const isActiveSignalSpan = (value: unknown): value is ActiveSignalSpan =>
  typeof value === 'object' && value !== null && 'signalId' in value && 'span' in value;

const toSeconds = (ms: number): number => ms / 1000;

/**
 * Creates the executive brief telemetry: OTel spans and metrics plus the EBT completion event.
 * Call `recordSignal` from inside `withSignalSpan` so the signal's outcome is also set on its span.
 */
export const createBriefTelemetry = ({
  analytics,
  logger,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
}): BriefTelemetry => {
  const instruments = getInstruments();

  return {
    withSpan: (name: BriefSpanName, attributes, fn) => {
      const stage = name === 'generate' ? undefined : name;
      return withActiveSpan(`${SPAN_PREFIX}.${name}`, { attributes }, async () => {
        const startedAt = performance.now();
        try {
          return await fn();
        } finally {
          if (stage) {
            instruments.stageDuration.record(toSeconds(performance.now() - startedAt), { stage });
          }
        }
      });
    },

    withSignalSpan: (signalId, fn) =>
      withActiveSpan(SIGNAL_SPAN_NAME, { attributes: { 'signal.id': signalId } }, (span) => {
        if (!span) {
          return fn();
        }
        const active: ActiveSignalSpan = { signalId, span };
        return context.with(context.active().setValue(SIGNAL_SPAN_KEY, active), fn);
      }),

    recordSignal: (run: SignalRun) => {
      instruments.signalDuration.record(toSeconds(run.durationMs), {
        'signal.id': run.id,
        'signal.status': run.status,
      });
      const active = context.active().getValue(SIGNAL_SPAN_KEY);
      if (isActiveSignalSpan(active) && active.signalId === run.id) {
        active.span.setAttributes({
          'signal.status': run.status,
          'signal.fact_count': run.factCount,
          'signal.link_count': run.linkCount,
        });
      }
    },

    recordTokens: ({ prompt, completion }) => {
      // Providers that report no usage give 0; recording it would skew the distribution.
      if (prompt > 0) {
        instruments.tokenUsage.record(prompt, { 'gen_ai.token.type': 'input' });
      }
      if (completion > 0) {
        instruments.tokenUsage.record(completion, { 'gen_ai.token.type': 'output' });
      }
    },

    recordVerificationDropped: (dropped) => {
      Object.entries(dropped).forEach(([check, count]) => {
        if (count && count > 0) {
          instruments.verificationDropped.add(count, { check: check as VerificationCheck });
        }
      });
    },

    recordRejected: (reason) => {
      instruments.rejected.add(1, { reason });
    },

    jobStarted: () => {
      instruments.active.add(1);
    },

    jobFinished: (event) => {
      instruments.active.add(-1);
      instruments.generationDuration.record(toSeconds(event.durationMs), {
        outcome: event.outcome,
        ...(event.outcome === 'failed' ? { 'error.type': event.errorCode ?? '_OTHER' } : {}),
      });
      try {
        analytics.reportEvent(ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT.eventType, event);
      } catch (error) {
        logger.debug(`Could not report the executive brief completed event: ${error.message}`);
      }
    },
  };
};
