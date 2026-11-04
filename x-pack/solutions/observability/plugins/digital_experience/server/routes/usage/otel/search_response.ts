/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PercentilesAggregation } from '../../../lib/helpers/aggregations';

// The aggregations `search_request.ts` asks for, by the same names.

/** Terms of a boolean field: the key is `1` or `0`, and `key_as_string` `true` or `false`. */
export interface DeviceBucket {
  key: number | string;
  key_as_string?: string;
  doc_count: number;
}

export interface PageBucket {
  key: string;
  doc_count: number;
  loadTime: PercentilesAggregation;
}

export interface NameBucket {
  key: string;
  doc_count: number;
}

export interface ClickBucket {
  key: string;
  doc_count: number;
  tagName: { buckets: Array<{ key: string }> };
}

/** `usageSearch`: the panels below the KPIs, in the selected environment. */
export interface UsageAggregations {
  inEnvironment: {
    pageLoads: {
      doc_count: number;
      topPages: { buckets: PageBucket[] };
      browsers: { buckets: NameBucket[] };
      operatingSystems: { buckets: NameBucket[] };
      devices: { buckets: DeviceBucket[] };
    };
    clicks: { doc_count: number; selectors: { buckets: ClickBucket[] } };
  };
}
