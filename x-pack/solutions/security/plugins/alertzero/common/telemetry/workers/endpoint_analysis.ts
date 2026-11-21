/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID } from '@kbn/alertzero-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  countInput,
  defineReportableEvents,
  flagInput,
  oneOfInput,
  requiredFlagInput,
} from '../report_step_input_fields';

/**
 * How one Endpoint Analysis run settled its indicator: `processed` with findings attached,
 * `no_host` when the discovery named no host (retired as processed with nothing to analyze),
 * `failed` when no findings landed, `proposals_lost` when findings landed but a containment
 * proposal did not reach the queue, `unreachable` when the Investigation could not be read,
 * `invalid` for a malformed indicator, and `not_pending` when the indicator was no longer pending.
 */
export const ENDPOINT_ANALYSIS_OUTCOMES = [
  'processed',
  'no_host',
  'failed',
  'proposals_lost',
  'unreachable',
  'invalid',
  'not_pending',
] as const;

export type EndpointAnalysisOutcome = (typeof ENDPOINT_ANALYSIS_OUTCOMES)[number];

const endpointAnalysisCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('endpoint_analysis_completed'),
    actions_recommended: countInput('Containment actions the analysis recommended'),
    agent_failed: flagInput('Whether the forensic agent failed'),
    analysis_outcome: oneOfInput(ENDPOINT_ANALYSIS_OUTCOMES, 'How the run settled its indicator'),
    auto_approve_requested: requiredFlagInput(
      'Whether the proposals asked the gate to auto-approve'
    ),
    findings_attached: flagInput('Whether the timeline and IoC findings are on the Investigation'),
    host_resolved: flagInput('Whether a host was found to analyze'),
    iocs_found: flagInput('Whether the analysis extracted any IoC'),
    proposals_dispatch_failed: countInput('Containment proposals that did not reach the queue'),
    proposals_dispatched: countInput('Containment proposals dispatched'),
    reused_prior_assessment: flagInput("Whether an earlier run's findings were reused"),
    timeline_found: flagInput('Whether the analysis reconstructed any timeline event'),
  })
);

export const ENDPOINT_ANALYSIS_REPORTABLE_EVENTS = defineReportableEvents(
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  {
    endpoint_analysis_completed: endpointAnalysisCompletedInputSchema,
  }
);
