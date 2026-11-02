/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AfterKey = Record<string, string> | undefined;

/** Top hit from latest_doc sub-agg (present when syncMarker is used) */
export interface LatestDocHit {
  _source?: Record<string, unknown>;
}

/** Top_hits sub-aggregation result (present when syncMarker is used) */
export interface LatestDocTopHits {
  hits: {
    hits: LatestDocHit[];
  };
}

export interface EntityBucket {
  key: { euid: string };
  doc_count: number;
  /** Present when buildEntitiesSearchBody is called with syncMarker */
  latest_doc?: LatestDocTopHits;
}

export interface EntitiesAggregation {
  entities?: {
    after_key?: AfterKey;
    buckets: EntityBucket[];
  };
}

export interface IndexSourceBucket {
  key: { identifier: string };
  doc_count: number;
}

export interface IndexSourceAggregation {
  identifiers?: {
    after_key?: AfterKey;
    buckets: IndexSourceBucket[];
  };
}
