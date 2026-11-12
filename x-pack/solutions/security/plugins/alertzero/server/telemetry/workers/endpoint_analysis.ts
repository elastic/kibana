/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import {
  ENDPOINT_ANALYSIS_OUTCOMES,
  type EndpointAnalysisOutcome,
} from '../../../common/telemetry/workers/endpoint_analysis';
import {
  ALERTZERO_TELEMETRY_PREFIX,
  ENVELOPE_SCHEMA,
  countField,
  flagField,
  vocabularyField,
  type AlertZeroEnvelope,
} from '../worker_event_fields';

export const ENDPOINT_ANALYSIS_TELEMETRY_EVENTS = {
  EndpointAnalysisCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_endpoint_analysis_completed`,
} as const;

export interface AlertZeroEndpointAnalysisCompletedPayload extends AlertZeroEnvelope {
  actions_recommended: number;
  agent_failed: boolean;
  analysis_outcome: EndpointAnalysisOutcome;
  auto_approve_requested: boolean;
  findings_attached: boolean;
  host_resolved: boolean;
  iocs_found: boolean;
  proposals_dispatch_failed: number;
  proposals_dispatched: number;
  reused_prior_assessment: boolean;
  timeline_found: boolean;
}

export interface EndpointAnalysisTelemetryEventPayloads {
  [ENDPOINT_ANALYSIS_TELEMETRY_EVENTS.EndpointAnalysisCompleted]: AlertZeroEndpointAnalysisCompletedPayload;
}

export const ALERTZERO_ENDPOINT_ANALYSIS_COMPLETED_EVENT: EventTypeOpts<AlertZeroEndpointAnalysisCompletedPayload> =
  {
    eventType: ENDPOINT_ANALYSIS_TELEMETRY_EVENTS.EndpointAnalysisCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      actions_recommended: countField('Containment actions the analysis recommended'),
      agent_failed: flagField('Whether the forensic agent failed'),
      analysis_outcome: vocabularyField(
        'How the run settled its indicator',
        ENDPOINT_ANALYSIS_OUTCOMES
      ),
      auto_approve_requested: flagField(
        'Whether containment proposals ask the gate to auto-approve (supervised autonomy)'
      ),
      findings_attached: flagField(
        'Whether both the timeline and the IoC findings are on the Investigation'
      ),
      host_resolved: flagField('Whether a host was found to analyze'),
      iocs_found: flagField('Whether the analysis extracted any indicator of compromise'),
      proposals_dispatch_failed: countField('Containment proposals that did not reach the queue'),
      proposals_dispatched: countField('Containment proposals dispatched to the queue'),
      reused_prior_assessment: flagField(
        "Whether the run found an earlier run's findings already attached and skipped the agent"
      ),
      timeline_found: flagField('Whether the analysis reconstructed any timeline event'),
    },
  };

export const ENDPOINT_ANALYSIS_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_ENDPOINT_ANALYSIS_COMPLETED_EVENT,
] as const;
