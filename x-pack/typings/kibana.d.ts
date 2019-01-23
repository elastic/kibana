/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module '@elastic/elasticsearch' {
  export interface ShardsResponse {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  }

  export interface Explanation {
    value: number;
    description: string;
    details: Explanation[];
  }

  export interface SearchResponse<T> {
    took: number;
    timed_out: boolean;
    _scroll_id?: string;
    _shards: ShardsResponse;
    hits: {
      total: number;
      max_score: number;
      hits: Array<{
        _index: string;
        _type: string;
        _id: string;
        _score: number;
        _source: T;
        _version?: number;
        _explanation?: Explanation;
        fields?: any;
        highlight?: any;
        inner_hits?: any;
        matched_queries?: string[];
        sort?: string[];
      }>;
    };
    aggregations?: any;
  }

  export interface MSearchResponse<T> {
    responses?: Array<SearchResponse<T>>;
  }
}

// We need this so TypeScript doesn't overwrite the typings from the @elastic/elasticsearch library with this file.
export {};
