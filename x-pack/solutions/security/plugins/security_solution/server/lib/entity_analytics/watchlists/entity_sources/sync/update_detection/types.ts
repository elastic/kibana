/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AfterKey = Record<string, string> | undefined;

/** Top hit from a top_hits sub-agg */
export interface LatestDocHit {
  _id?: string;
  _source?: Record<string, unknown>;
}

/** Top_hits sub-aggregation result */
export interface LatestDocTopHits {
  hits: {
    hits: LatestDocHit[];
  };
}

export interface EntityBucket {
  key: { euid: string };
  doc_count: number;
  /** The entity's single most recent document, regardless of whether it matches queryRule. */
  latest_doc?: LatestDocTopHits;
  /**
   * The entity's single most recent document that *also* matches queryRule, if any (only
   * present when queryRule is set).
   */
  latest_matching_doc?: { doc: LatestDocTopHits };
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
