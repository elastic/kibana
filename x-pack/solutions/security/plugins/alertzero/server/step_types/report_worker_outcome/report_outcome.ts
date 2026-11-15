/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ReportWorkerOutcomeEvent,
  ReportWorkerOutcomeStepInput,
} from '../../../common/step_types';
import type {
  AlertZeroEnvelope,
  AlertZeroTelemetryEventPayloads,
  AlertZeroTelemetryEventType,
  AlertZeroTelemetryReporter,
} from '../../telemetry';
import { ALERTZERO_TELEMETRY_EVENTS } from '../../telemetry';

export interface ReportOutcomeParams {
  envelope: AlertZeroEnvelope;
  input: ReportWorkerOutcomeStepInput;
  report: AlertZeroTelemetryReporter;
}

/** The fields the server derives rather than trusting the YAML to keep consistent. */
interface DerivedFields {
  worker_run_completed: { degraded: boolean };
}

/** The fields of one outcome's step input, without its `event`, plus the ones derived from it. */
type OutcomeFields<E extends ReportWorkerOutcomeEvent> = Omit<
  Extract<ReportWorkerOutcomeStepInput, { event: E }>,
  'event'
> &
  (E extends keyof DerivedFields ? DerivedFields[E] : {});

/** The event types whose payload an outcome's fields, on top of the envelope, satisfy. */
type EventTypesAccepting<E extends ReportWorkerOutcomeEvent> = {
  [K in AlertZeroTelemetryEventType]: AlertZeroEnvelope &
    OutcomeFields<E> extends AlertZeroTelemetryEventPayloads[K]
    ? K
    : never;
}[AlertZeroTelemetryEventType];

/** The event each step outcome reports. The type check fails if a payload would not fit. */
const EVENT_TYPE_BY_OUTCOME = {
  ad_worker_run_completed: ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted,
  ad_worker_review_started: ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted,
  ad_worker_analysis_completed: ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted,
  ad_worker_handoff_resolved: ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved,
  worker_investigation_closed: ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
  worker_run_completed: ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted,
  alert_triage_batch_classified: ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified,
  alert_triage_closure_resolved: ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved,
  rule_tuning_review_completed: ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
  rule_coverage_review_completed: ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
  hunt_report_completed: ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted,
  endpoint_analysis_completed: ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted,
} as const satisfies { [E in ReportWorkerOutcomeEvent]: EventTypesAccepting<E> };

/** Drops keys whose value is `undefined`, so optional event fields are omitted, not sent empty. */
const omitUndefined = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

/**
 * A run is degraded when it names a reason, or when its own flags or counts say it did less than
 * the work it found, so YAML never sends `degraded`.
 */
const withDerivedFields = (input: ReportWorkerOutcomeStepInput) =>
  input.event === 'worker_run_completed'
    ? {
        ...input,
        degraded:
          input.degraded_reason !== 'none' ||
          input.lookup_failed ||
          input.source_read_failed ||
          input.items_failed > 0,
      }
    : input;

/** Reports the event a parsed step input names, with the run's envelope fields taking precedence. */
export const reportOutcome = ({ envelope, input, report }: ReportOutcomeParams): boolean => {
  const { event, ...fields } = withDerivedFields(input);
  return report(EVENT_TYPE_BY_OUTCOME[event], { ...omitUndefined(fields), ...envelope });
};
