/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const keyword: MappingProperty = { type: 'keyword', ignore_above: 1024 };
const date: MappingProperty = { type: 'date' };

export const summaryMappings: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': date,
    run_id: keyword,
    started_at: date,
    finished_at: date,
    status: keyword,
    hosts_scanned: { type: 'integer' },
    findings_open: { type: 'integer' },
    findings_fixed: { type: 'integer' },
    kev: { properties: { status: keyword, listed: { type: 'integer' } } },
    distinct_cves: { type: 'integer' },
    feeds: {
      properties: {
        release: keyword,
        status: keyword,
        etag: keyword,
        // Not indexed for search; keeps a long vendor error from hitting ignore_above silently.
        error: { type: 'keyword', index: false, doc_values: false, ignore_above: 2048 },
        source_url: keyword,
        snapshot_time: date,
        age_seconds: { type: 'integer' },
      },
    },
    failures: { type: 'keyword', index: false, doc_values: false, ignore_above: 2048 },
  },
};
