/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import type {
  InvestigationCloseReason,
  WorkerDegradedReason,
  WorkerRunOutcome,
} from '../../common/telemetry/constants';
import {
  INVESTIGATION_CLOSE_REASONS,
  WORKER_DEGRADED_REASONS,
  WORKER_RUN_OUTCOMES,
} from '../../common/telemetry/constants';
import type { AlertZeroWatchTag, AlertZeroWorkerId } from './constants';
import { ALERTZERO_TELEMETRY_EVENTS } from './constants';
import { formatVocabulary } from './format_vocabulary';
import {
  ENVELOPE_SCHEMA,
  INVESTIGATION_ID_DESCRIPTION,
  IS_DEFAULT_SPACE_DESCRIPTION,
  WATCH_TAG_DESCRIPTION,
  WORKER_ID_DESCRIPTION,
  countField,
  flagField,
  vocabularyField,
  type AlertZeroEnvelope,
} from './worker_event_fields';
import {
  ALERT_TRIAGE_TELEMETRY_EVENT_TYPES,
  type AlertTriageTelemetryEventPayloads,
} from './workers/alert_triage';
import {
  ATTACK_DISCOVERY_TELEMETRY_EVENT_TYPES,
  type AttackDiscoveryTelemetryEventPayloads,
} from './workers/attack_discovery';
import {
  ENDPOINT_ANALYSIS_TELEMETRY_EVENT_TYPES,
  type EndpointAnalysisTelemetryEventPayloads,
} from './workers/endpoint_analysis';
import {
  RULE_COVERAGE_TELEMETRY_EVENT_TYPES,
  type RuleCoverageTelemetryEventPayloads,
} from './workers/rule_coverage';
import {
  RULE_TUNING_TELEMETRY_EVENT_TYPES,
  type RuleTuningTelemetryEventPayloads,
} from './workers/rule_tuning';
import {
  CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENT_TYPES,
  type ContinuousThreatHuntTelemetryEventPayloads,
} from './workers/continuous_threat_hunt';

export type { AlertZeroEnvelope } from './worker_event_fields';

export interface AlertZeroWorkerInvestigationClosedPayload extends AlertZeroEnvelope {
  close_reason: InvestigationCloseReason;
  investigation_id: string;
}

export interface AlertZeroWorkerInvestigationReopenedPayload {
  investigation_id: string;
  is_default_space: boolean;
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
}

export interface AlertZeroWorkerRunCompletedPayload extends AlertZeroEnvelope {
  candidates_found: number;
  degraded: boolean;
  degraded_reason: WorkerDegradedReason;
  items_dispatched: number;
  items_failed: number;
  items_in_flight: number;
  lookup_failed: boolean;
  run_outcome: WorkerRunOutcome;
  source_read_failed: boolean;
}

/** The payload each AlertZero event type carries. */
export interface AlertZeroTelemetryEventPayloads
  extends AttackDiscoveryTelemetryEventPayloads,
    AlertTriageTelemetryEventPayloads,
    RuleTuningTelemetryEventPayloads,
    RuleCoverageTelemetryEventPayloads,
    ContinuousThreatHuntTelemetryEventPayloads,
    EndpointAnalysisTelemetryEventPayloads {
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed]: AlertZeroWorkerInvestigationClosedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened]: AlertZeroWorkerInvestigationReopenedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted]: AlertZeroWorkerRunCompletedPayload;
}

export const ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT: EventTypeOpts<AlertZeroWorkerInvestigationClosedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
    schema: {
      ...ENVELOPE_SCHEMA,
      close_reason: {
        type: 'keyword',
        _meta: {
          description: `Investigation template close reason the Worker wrote, or the class its close maps to: ${formatVocabulary(
            INVESTIGATION_CLOSE_REASONS
          )}`,
          optional: false,
        },
      },
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: `The Investigation the Worker closed. The envelope's \`worker_id\` says which Worker. ${INVESTIGATION_ID_DESCRIPTION}`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_WORKER_INVESTIGATION_REOPENED_EVENT: EventTypeOpts<AlertZeroWorkerInvestigationReopenedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened,
    schema: {
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: `The Investigation the Worker reopened, so a new run records into active work. ${INVESTIGATION_ID_DESCRIPTION}`,
          optional: false,
        },
      },
      is_default_space: {
        type: 'boolean',
        _meta: { description: IS_DEFAULT_SPACE_DESCRIPTION, optional: false },
      },
      watch_tag: {
        type: 'keyword',
        _meta: { description: WATCH_TAG_DESCRIPTION, optional: false },
      },
      worker_id: {
        type: 'keyword',
        _meta: {
          description: `${WORKER_ID_DESCRIPTION}. Only the Hunt Worker reopens its own Investigations today`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_WORKER_RUN_COMPLETED_EVENT: EventTypeOpts<AlertZeroWorkerRunCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      candidates_found: countField(
        "Work items the run found to work on, in the Worker's own unit (alerts, rules, indicators or reports)"
      ),
      degraded: flagField(
        'Whether the run did less than the work it found: true when it reported a `degraded_reason` other than `none`, some items failed, a lookup failed and the run carried on without it, or reading its source failed'
      ),
      degraded_reason: vocabularyField(
        'Main reason the run did less than the work it found, `none` when it did not',
        WORKER_DEGRADED_REASONS
      ),
      items_dispatched: countField('Work items the run started or handed on'),
      items_failed: countField('Work items that failed or could not be started'),
      items_in_flight: countField(
        'Work items still in progress when the run reported that it did not wait for (reviews or analyses it handed off, or that earlier runs started)'
      ),
      lookup_failed: flagField(
        'Whether a secondary lookup (for example the list of reviews already in progress) failed and the run carried on without it'
      ),
      run_outcome: vocabularyField('How the run ended', WORKER_RUN_OUTCOMES),
      source_read_failed: flagField(
        'Whether reading the source of work items failed; zero candidates then does not mean there was no work'
      ),
    },
  };

/** Every AlertZero event type, in registration order. */
export const ALERTZERO_TELEMETRY_EVENT_TYPES = [
  ...ATTACK_DISCOVERY_TELEMETRY_EVENT_TYPES,
  ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT,
  ALERTZERO_WORKER_INVESTIGATION_REOPENED_EVENT,
  ALERTZERO_WORKER_RUN_COMPLETED_EVENT,
  ...ALERT_TRIAGE_TELEMETRY_EVENT_TYPES,
  ...RULE_TUNING_TELEMETRY_EVENT_TYPES,
  ...RULE_COVERAGE_TELEMETRY_EVENT_TYPES,
  ...CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENT_TYPES,
  ...ENDPOINT_ANALYSIS_TELEMETRY_EVENT_TYPES,
] as const;
