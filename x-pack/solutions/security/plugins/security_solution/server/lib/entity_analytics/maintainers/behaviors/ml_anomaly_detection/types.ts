/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';

export interface AnomalyHit {
  _id: string;
  entityId: string;
  jobId: string;
  detectorIndex: number;
  timestamp: number;
  recordScore: number;
  actual: number;
  typical: number;
  fieldName?: string;
  byFieldName?: string;
  byFieldValue?: string;
  overFieldName?: string;
  overFieldValue?: string;
  partitionFieldName?: string;
  partitionFieldValue?: string;
}

export interface BaselineBucket {
  value: string;
  doc_count: number;
  topHits: unknown[];
}

export interface EnrichedAnomalyRecord {
  entity: {
    id: string;
    type: EntityType;
  };
  anomaly: {
    _id: string;
    job_id: string;
    detector_index: number;
    timestamp: number;
    record_score: number;
    field_name?: string;
    actual?: number;
    typical?: number;
    by_field_name?: string;
    by_field_value?: string;
    over_field_name?: string;
    over_field_value?: string;
    partition_field_name?: string;
    partition_field_value?: string;
  };
  baseline: Array<{ value: string; doc_count: number; top_hits: unknown[] }>;
}
