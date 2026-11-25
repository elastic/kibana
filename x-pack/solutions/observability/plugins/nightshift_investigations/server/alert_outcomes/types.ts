/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

/** Where an alert lives. Only `elastic` has an adapter in v0; the rest are recorded for ranking. */
export const ALERT_OUTCOME_SOURCES = [
  'elastic',
  'pagerduty',
  'servicenow',
  'grafana',
  'datadog',
  'newrelic',
  'rootly',
  'alertmanager',
  'opsgenie',
  'other',
  'unknown',
] as const;
export type AlertOutcomeSource = (typeof ALERT_OUTCOME_SOURCES)[number];

export const UNTRACKABLE_REASONS = [
  'unsupported_source',
  'no_readable_connector',
  'insufficient_identity',
  'not_found',
  'ambiguous',
  'inconsistent_timing',
  'access_denied',
] as const;
export type UntrackableReason = (typeof UNTRACKABLE_REASONS)[number];

export const STOP_REASONS = [
  'investigation_closed',
  'untracked_by_source',
  'stale',
  'access_lost',
  'expired',
] as const;
export type StopReason = (typeof STOP_REASONS)[number];

export const TRACKING_STATES = [
  'tracking',
  'recovering',
  'recovered',
  'untrackable',
  'stopped',
] as const;
export type TrackingState = (typeof TRACKING_STATES)[number];

export const CHECK_STATUSES = ['firing', 'recovered', 'stale', 'unknown', 'error'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

/** The connector id an identity proposal uses for alerts on the investigation's own cluster. */
export const LOCAL_CONNECTOR_ID = 'local';

const MAX_ID_LENGTH = 500;

export const identityProposalSchema = lazySchema(() =>
  z.object({
    source: z.enum(ALERT_OUTCOME_SOURCES),
    connector_id: z.string().max(MAX_ID_LENGTH).nullable(),
    alert_id: z.string().max(MAX_ID_LENGTH).nullable(),
    rule_id: z.string().max(MAX_ID_LENGTH).nullable(),
    instance_key: z.string().max(1_000).nullable(),
    evidence: z
      .array(
        z.object({
          kind: z.enum(['post_link', 'post_text', 'tool_call']),
          value: z.string().max(2_000),
        })
      )
      .max(10),
  })
);
export type IdentityProposal = z.infer<typeof identityProposalSchema>;

/** One exact alert instance an adapter resolved and can check. */
export interface AlertRef {
  source: AlertOutcomeSource;
  connector_id: string;
  alert_uuid: string;
  instance_id?: string;
  rule_id?: string;
  rule_name?: string;
  rule_type_id?: string;
  alert_start?: string;
}

export type ResolveResult = { ref: AlertRef } | { untrackable: UntrackableReason; detail?: string };

/** One tracking record per investigation; its document id is the investigation id. */
export interface TrackingRecord {
  investigation_id: string;
  space_id: string;
  automation_id?: string;
  subject_type?: string;
  post_received_at: string;
  created_at: string;
  updated_at: string;
  state: TrackingState;
  untrackable_reason?: UntrackableReason;
  untrackable_detail?: string;
  stop_reason?: StopReason;
  source?: AlertOutcomeSource;
  connector_id?: string;
  proposal?: IdentityProposal;
  ref?: AlertRef;
  last_status?: CheckStatus;
  last_checked_at?: string;
  /** The last check that saw the alert firing; the start of the recovery window. */
  last_firing_at?: string;
  next_check_at?: string;
  consecutive_failures: number;
  recovered_seen_at?: string;
  recovering_since?: string;
  recovery_execution_id?: string;
}
