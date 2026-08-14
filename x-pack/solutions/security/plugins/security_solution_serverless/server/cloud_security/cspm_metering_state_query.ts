/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGGREGATION_PRECISION_THRESHOLD,
  ASSETS_SAMPLE_GRANULARITY,
  BILLABLE_ASSETS_CONFIG,
  CDR_METERING_STATE_INDEX,
  CSPM,
  GCP_COMPUTE_MIN_RUNNING_DURATION_HOURS,
  GCP_COMPUTE_INSTANCE_SUB_TYPE,
  METERING_CONFIGS,
} from './constants';

const GCP_MIN_RUN_MS = GCP_COMPUTE_MIN_RUNNING_DURATION_HOURS * 60 * 60 * 1000;
// Sampling window: how far back a scan counts as "active". Exported so the
// freshness probe in cloud_security_metering_task shares this exact expression
// by construction — a probe on a wider/narrower window than the billing query
// could select the state path on data the billing query cannot see.
export const CSPM_METERING_WINDOW = `now-${ASSETS_SAMPLE_GRANULARITY}`;
const WINDOW = CSPM_METERING_WINDOW;
// Minimum attested run duration for a billable GCP instance. Independent of
// the sampling window even though both resolve to 24h today.
const GCP_MIN_RUN_WINDOW = `now-${GCP_COMPUTE_MIN_RUNNING_DURATION_HOURS}h`;
const SUB_TYPE_FIELD = BILLABLE_ASSETS_CONFIG[CSPM].filter_attribute;
const STATUS_FIELD = 'latest.resource.lifecycle.status';
const LAST_START_FIELD = 'latest.resource.lifecycle.last_started_at';
const LAST_STOP_FIELD = 'latest.resource.lifecycle.last_stopped_at';
const LAST_RUN_FIELD = 'latest.resource.lifecycle.last_run_ms';

/**
 * CSPM billing query against the metering state index (maintained by the
 * cloud_security_posture metering_state transform). All fields are indexed —
 * lifted from resource.raw at ingest by the cloud_security_posture package
 * pipeline (>= 3.6.0) — and all billing math is precomputed (span_ms by the
 * transform, last_run_ms at ingest), so this request is plain term/range
 * filters: no runtime fields, no script queries.
 *
 * Billing rules (security-team#17662):
 *  1. Active (all sub_types): scanned within the sampling window.
 *  2. Non-GCP sub_types: presence is sufficient — semantics identical to the
 *     legacy latest-index query. The two-scan rule is deliberately GCP-scoped.
 *  3. gcp-compute-instance: two-scan corroboration (span_ms > 0 — seen on >=2
 *     scans of the CURRENT VM incarnation; POLICY KNOB) plus a >=24h attested
 *     run — RUNNING with an old-enough start, or stopped inside this window
 *     after a >=24h run (a stop older than the window was already billed on
 *     its stop day and never re-bills).
 *
 * The aggregations produce a response shape identical to the legacy CSPM
 * aggregation — which is what getUsageRecords depends on — so it consumes this
 * response unchanged, including the per-subtype metadata counters. The one
 * field difference: min_timestamp reads last_seen here, since the state index
 * has no @timestamp; usage_timestamp therefore becomes the oldest last_seen
 * among billable state docs rather than the oldest finding timestamp. Both sit
 * inside the same sampling window.
 *
 * unique_assets stays a cardinality on resource.id (not incarnation): two
 * incarnations of one name active in the same window are one billable asset.
 */
export const getCspmStateAggQuery = () => ({
  index: CDR_METERING_STATE_INDEX,
  size: 0,
  query: {
    bool: {
      must: [{ term: { posture_type: CSPM } }, { range: { last_seen: { gte: WINDOW } } }],
      should: [
        // Non-GCP sub_types: presence in window, exactly today's semantics.
        {
          bool: {
            must_not: [{ term: { [SUB_TYPE_FIELD]: GCP_COMPUTE_INSTANCE_SUB_TYPE } }],
          },
        },
        {
          bool: {
            must: [
              { term: { [SUB_TYPE_FIELD]: GCP_COMPUTE_INSTANCE_SUB_TYPE } },
              { range: { span_ms: { gt: 0 } } },
              { term: { [STATUS_FIELD]: 'RUNNING' } },
              { range: { [LAST_START_FIELD]: { lte: GCP_MIN_RUN_WINDOW } } },
            ],
          },
        },
        {
          bool: {
            must: [
              { term: { [SUB_TYPE_FIELD]: GCP_COMPUTE_INSTANCE_SUB_TYPE } },
              { range: { span_ms: { gt: 0 } } },
              { range: { [LAST_RUN_FIELD]: { gte: GCP_MIN_RUN_MS } } },
              { range: { [LAST_STOP_FIELD]: { gte: WINDOW } } },
            ],
            must_not: [{ term: { [STATUS_FIELD]: 'RUNNING' } }],
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
  aggs: {
    resource_sub_type: {
      terms: { field: BILLABLE_ASSETS_CONFIG[CSPM].filter_attribute },
      aggs: {
        unique_assets: {
          cardinality: {
            field: METERING_CONFIGS[CSPM].assets_identifier,
            precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
          },
        },
      },
    },
    min_timestamp: { min: { field: 'last_seen' } },
  },
});
