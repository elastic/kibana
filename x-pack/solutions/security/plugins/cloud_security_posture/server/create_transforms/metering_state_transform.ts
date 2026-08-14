/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  MappingTypeMapping,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import {
  FINDINGS_INDEX_PATTERN,
  CDR_METERING_STATE_INDEX,
} from '@kbn/cloud-security-posture-common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';

export const METERING_STATE_TRANSFORM_ID = 'cloud_security_posture.metering_state-default-1.0.0';

/**
 * Explicit dest mappings (deduce_mappings: false): bucket_script outputs are
 * not reliably deduced.
 */
export const METERING_STATE_INDEX_MAPPINGS: MappingTypeMapping = {
  properties: {
    resource: {
      properties: {
        id: { type: 'keyword' },
        sub_type: { type: 'keyword' },
        lifecycle: { properties: { incarnation: { type: 'keyword' } } },
      },
    },
    cloud: { properties: { account: { properties: { id: { type: 'keyword' } } } } },
    posture_type: { type: 'keyword' },
    first_seen: { type: 'date' },
    last_seen: { type: 'date' },
    // last_seen - first_seen. > 0 means seen on >=2 scans of this incarnation.
    span_ms: { type: 'long' },
    // Lifecycle state of this incarnation. When the source findings carry no
    // lifecycle data the max aggs write JSON null and the bucket_script writes
    // nothing at all; both are `exists: false`, which is what the billing query
    // relies on. What matters is that neither is the string "null" — see the
    // aggregation comments below.
    last_started_at: { type: 'date' },
    last_stopped_at: { type: 'date' },
    last_run_ms: { type: 'long' },
  },
};

/**
 * Plain pivot transform maintaining per-incarnation scan state for CSPM
 * metering (https://github.com/elastic/security-team/issues/17662).
 * Grouping on resource.lifecycle.incarnation makes spot-VM name reuse
 * harmless: a re-created VM gets a fresh state doc, so first_seen/span_ms
 * never bridge across different physical instances.
 *
 * The lifecycle fields are indexed at ingest by the cloud_security_posture
 * package pipeline (>= 3.6.0); the only scripts here are bucket_scripts over
 * already-aggregated numbers, so no per-document script ever runs.
 *
 * Docs from packages < 3.6.0 have no resource.lifecycle fields; incarnation
 * uses missing_bucket so non-GCP resources (which never have lifecycle
 * fields) still get state docs under a null incarnation.
 */
export const meteringStateTransform: TransformPutTransformRequest = {
  transform_id: METERING_STATE_TRANSFORM_ID,
  description:
    'Per-incarnation scan state (first/last seen, lifecycle) for stateful CSPM metering (security-team#17662)',
  source: {
    index: FINDINGS_INDEX_PATTERN,
    query: { term: { 'rule.benchmark.posture_type': 'cspm' } },
  },
  dest: { index: CDR_METERING_STATE_INDEX },
  frequency: '5m',
  sync: { time: { field: 'event.ingested', delay: '60s' } },
  retention_policy: { time: { field: 'last_seen', max_age: '7d' } },
  pivot: {
    group_by: {
      'resource.id': { terms: { field: 'resource.id' } },
      'resource.lifecycle.incarnation': {
        terms: { field: 'resource.lifecycle.incarnation', missing_bucket: true },
      },
      'resource.sub_type': { terms: { field: 'resource.sub_type' } },
      'cloud.account.id': { terms: { field: 'cloud.account.id' } },
      posture_type: { terms: { field: 'rule.benchmark.posture_type' } },
    },
    aggregations: {
      first_seen: { min: { field: '@timestamp' } },
      last_seen: { max: { field: '@timestamp' } },
      span_ms: {
        bucket_script: {
          buckets_path: { first: 'first_seen', last: 'last_seen' },
          script: 'params.last - params.first',
        },
      },
      /**
       * These were a single top_metrics agg sorted by @timestamp desc. That is
       * unusable here: top_metrics emits the STRING "null" for a metric with no
       * value in the bucket, and a date/long mapping rejects it
       * ("failed to parse date field [null]"), so the ENTIRE state document is
       * dropped. Since unattended transforms retry forever, the failure is
       * silent. It hit every resource lacking any one lifecycle field — i.e.
       * every non-GCP resource and every GCP instance that had never stopped,
       * which is to say both primary billing paths.
       *
       * max over the incarnation is equivalent to "value on the most recent
       * scan" because these timestamps are monotonic within one incarnation,
       * and the incarnation IS the group key — a re-created VM starts a fresh
       * bucket rather than inheriting the previous instance's timestamps.
       *
       * The names are deliberately flat rather than nested under a `latest.`
       * prefix: bucket_script resolves buckets_path against sibling agg names,
       * and it parses dots as a metric sub-path, so a sibling named
       * `latest.resource.lifecycle.last_started_at` is unreachable
       * ("No aggregation found for path").
       */
      last_started_at: { max: { field: 'resource.lifecycle.last_started_at' } },
      last_stopped_at: { max: { field: 'resource.lifecycle.last_stopped_at' } },
      /**
       * Duration of the run that ended at last_stopped_at. The default
       * gap_policy ('skip') leaves this absent — properly absent, not the
       * string "null" — when the instance has never stopped.
       *
       * A NEGATIVE value means the instance was started again after its last
       * stop, i.e. it is running now. That is load-bearing, not a quirk: it is
       * how the billing query distinguishes a restarted-and-running instance
       * from a stopped one now that lifecycle status is no longer carried.
       * It also self-disqualifies from the stopped branch's >= 24h run check.
       */
      last_run_ms: {
        bucket_script: {
          buckets_path: { start: 'last_started_at', stop: 'last_stopped_at' },
          script: 'params.stop - params.start',
        },
      },
    },
  },
  settings: { unattended: true, deduce_mappings: false },
  _meta: {
    package: { name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME },
    managed_by: 'cloud_security_posture',
    managed: true,
  },
};
