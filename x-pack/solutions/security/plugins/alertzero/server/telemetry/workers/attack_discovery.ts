/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import {
  AD_WORKER_ANALYSIS_VERDICTS,
  AD_WORKER_ESCALATED_VERDICTS,
  AD_WORKER_HANDOFF_OUTCOMES,
  AD_WORKER_RUN_OUTCOMES,
  type AdWorkerAnalysisVerdict,
  type AdWorkerEscalatedVerdict,
  type AdWorkerHandoffOutcome,
  type AdWorkerRunOutcome,
} from '../../../common/telemetry/workers/attack_discovery';
import { formatVocabulary } from '../format_vocabulary';
import {
  ALERTZERO_TELEMETRY_PREFIX,
  ENVELOPE_SCHEMA,
  INVESTIGATION_ID_DESCRIPTION,
  type AlertZeroEnvelope,
} from '../worker_event_fields';

export const ATTACK_DISCOVERY_TELEMETRY_EVENTS = {
  AdWorkerRunCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_run_completed`,
  AdWorkerReviewStarted: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_review_started`,
  AdWorkerAnalysisCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_analysis_completed`,
  AdWorkerHandoffResolved: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_handoff_resolved`,
} as const;

export interface AlertZeroAdWorkerRunCompletedPayload extends AlertZeroEnvelope {
  alerts_analyzed: number;
  attacks_generated: number;
  attacks_persisted: number;
  batches_failed: number;
  batches_total: number;
  run_outcome: AdWorkerRunOutcome;
}

export interface AlertZeroAdWorkerReviewStartedPayload extends AlertZeroEnvelope {
  investigation_id: string;
  is_rereview: boolean;
}

export interface AlertZeroAdWorkerAnalysisCompletedPayload extends AlertZeroEnvelope {
  analysis_error: boolean;
  verdict: AdWorkerAnalysisVerdict;
}

export interface AlertZeroAdWorkerHandoffResolvedPayload extends AlertZeroEnvelope {
  auto_approve_requested: boolean;
  outcome: AdWorkerHandoffOutcome;
  verdict: AdWorkerEscalatedVerdict;
}

export interface AttackDiscoveryTelemetryEventPayloads {
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerRunCompleted]: AlertZeroAdWorkerRunCompletedPayload;
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerReviewStarted]: AlertZeroAdWorkerReviewStartedPayload;
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted]: AlertZeroAdWorkerAnalysisCompletedPayload;
  [ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerHandoffResolved]: AlertZeroAdWorkerHandoffResolvedPayload;
}

export const ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT: EventTypeOpts<AlertZeroAdWorkerRunCompletedPayload> =
  {
    eventType: ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerRunCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_analyzed: {
        type: 'long',
        _meta: { description: 'Number of alerts sent to generation', optional: false },
      },
      attacks_generated: {
        type: 'long',
        _meta: {
          description: 'Number of attacks the model generated, before deduplication',
          optional: false,
        },
      },
      attacks_persisted: {
        type: 'long',
        _meta: {
          description: 'Number of attacks persisted and dispatched for review',
          optional: false,
        },
      },
      batches_failed: {
        type: 'long',
        _meta: { description: 'Number of generation batches that failed', optional: false },
      },
      batches_total: {
        type: 'long',
        _meta: { description: 'Number of generation batches attempted', optional: false },
      },
      run_outcome: {
        type: 'keyword',
        _meta: {
          description: `How the run ended: ${formatVocabulary(AD_WORKER_RUN_OUTCOMES)}`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_AD_WORKER_REVIEW_STARTED_EVENT: EventTypeOpts<AlertZeroAdWorkerReviewStartedPayload> =
  {
    eventType: ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerReviewStarted,
    schema: {
      ...ENVELOPE_SCHEMA,
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: `The Investigation the review opened or reused; joins Investigation events to the run. ${INVESTIGATION_ID_DESCRIPTION}`,
          optional: false,
        },
      },
      is_rereview: {
        type: 'boolean',
        _meta: {
          description: 'Whether the attack already had an Investigation (a re-review)',
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_AD_WORKER_ANALYSIS_COMPLETED_EVENT: EventTypeOpts<AlertZeroAdWorkerAnalysisCompletedPayload> =
  {
    eventType: ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      analysis_error: {
        type: 'boolean',
        _meta: {
          description: 'Whether the FP/TP analysis failed or timed out',
          optional: false,
        },
      },
      verdict: {
        type: 'keyword',
        _meta: {
          description: `FP/TP analysis verdict: ${formatVocabulary(AD_WORKER_ANALYSIS_VERDICTS)}`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_AD_WORKER_HANDOFF_RESOLVED_EVENT: EventTypeOpts<AlertZeroAdWorkerHandoffResolvedPayload> =
  {
    eventType: ATTACK_DISCOVERY_TELEMETRY_EVENTS.AdWorkerHandoffResolved,
    schema: {
      ...ENVELOPE_SCHEMA,
      auto_approve_requested: {
        type: 'boolean',
        _meta: {
          description: 'Whether the review asked the escalation gate to auto-approve',
          optional: false,
        },
      },
      outcome: {
        type: 'keyword',
        _meta: {
          description: `How the completed escalation gate resolved the forensics handoff: ${formatVocabulary(
            AD_WORKER_HANDOFF_OUTCOMES
          )}`,
          optional: false,
        },
      },
      verdict: {
        type: 'keyword',
        _meta: {
          description: `FP/TP analysis verdict that led to the escalation: ${formatVocabulary(
            AD_WORKER_ESCALATED_VERDICTS
          )}`,
          optional: false,
        },
      },
    },
  };

export const ATTACK_DISCOVERY_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT,
  ALERTZERO_AD_WORKER_REVIEW_STARTED_EVENT,
  ALERTZERO_AD_WORKER_ANALYSIS_COMPLETED_EVENT,
  ALERTZERO_AD_WORKER_HANDOFF_RESOLVED_EVENT,
] as const;
