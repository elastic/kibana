/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SyntheticsAggregationsResponse {
  aggregations: {
    by_monitor: {
      doc_count_error_upper_bound: number;
      sum_other_doc_count: number;
      buckets: MonitorBucket[];
    };
  };
}

export interface MonitorBucket {
  key: string; // monitor name
  doc_count: number;
  latest_run: {
    hits: {
      total: {
        value: number;
        relation: string;
      };
      max_score: number | null;
      hits: Array<{
        _index: string;
        _id: string;
        _score: number | null;
        _source: SyntheticsMonitorSource;
        sort: number[];
      }>;
    };
  };
}

export interface SyntheticsMonitorSource {
  monitor: {
    name: string;
    type: string;
    id: string;
    status?: string;
  };
  url: {
    full: string;
  };
  observer: {
    geo: {
      name: string;
    };
    name: string;
  };
  '@timestamp': string;
  config_id: string;
  meta: {
    space_id: string[];
  };
}
