/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SampleDocTopHitsAgg {
  hits: {
    hits: Array<{
      _id: string;
      _source?: {
        '@timestamp'?: string;
      };
    }>;
  };
}

interface TraceIdsTermsAgg {
  buckets: Array<{
    key: string;
    doc_count: number;
    sample_doc: SampleDocTopHitsAgg;
  }>;
}

interface SampleAgg {
  doc_count: number;
  trace_ids?: TraceIdsTermsAgg;
}

export interface TraceIdAggregations {
  sample?: SampleAgg;
}
