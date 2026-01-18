/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AnchorDocTopHitsAgg {
  hits: {
    hits: Array<{
      _id: string;
      _source?: {
        '@timestamp'?: string;
      };
    }>;
  };
}

interface UniqueValuesTermsAgg {
  buckets: Array<{
    key: string;
    doc_count: number;
    anchor_doc: AnchorDocTopHitsAgg;
  }>;
}

interface DiverseSamplerAgg {
  doc_count: number;
  unique_values?: UniqueValuesTermsAgg;
}

interface FieldFilterAgg {
  doc_count: number;
  diverse_sampler: DiverseSamplerAgg;
}

export type CorrelationFieldAggregations = Record<string, FieldFilterAgg>;
