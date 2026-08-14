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
 * Explicit dest mappings (deduce_mappings: false): top_metrics and
 * bucket_script outputs are not reliably deduced.
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
    latest: {
      properties: {
        'resource.lifecycle.status': { type: 'keyword' },
        'resource.lifecycle.last_started_at': { type: 'date' },
        'resource.lifecycle.last_stopped_at': { type: 'date' },
        'resource.lifecycle.last_run_ms': { type: 'long' },
      },
    },
  },
};

/**
 * Plain pivot transform maintaining per-incarnation scan state for CSPM
 * metering (https://github.com/elastic/security-team/issues/17662).
 * Grouping on resource.lifecycle.incarnation makes spot-VM name reuse
 * harmless: a re-created VM gets a fresh state doc, so first_seen/span_ms
 * never bridge across different physical instances.
 *
 * No scripts anywhere: the lifecycle fields are indexed at ingest by the
 * cloud_security_posture package pipeline (>= 3.6.0).
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
      latest: {
        top_metrics: {
          metrics: [
            { field: 'resource.lifecycle.status' },
            { field: 'resource.lifecycle.last_started_at' },
            { field: 'resource.lifecycle.last_stopped_at' },
            { field: 'resource.lifecycle.last_run_ms' },
          ],
          sort: { '@timestamp': 'desc' },
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
