/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateTime } from '@elastic/elasticsearch/lib/api/types';
import type { Nullable } from './types';

export interface IlmPolicies {
  items: IlmPolicy[];
}

export interface IlmPolicy {
  policy_name: string;
  modified_date: DateTime;
  phases: IlmPhases;
}

export interface IlmPhases {
  cold: Nullable<IlmPhase>;
  delete: Nullable<IlmPhase>;
  frozen: Nullable<IlmPhase>;
  hot: Nullable<IlmPhase>;
  warm: Nullable<IlmPhase>;
}

export interface IlmPhase {
  min_age: string;
}

export interface IlmsStats {
  items: IlmStats[];
}

export interface IlmStats {
  index_name: string;
  phase?: string;
  age?: string;
  policy_name?: string;
}

export interface IndicesStats {
  items: IndexStats[];
}

export interface IndexStats {
  index_name: string;
  query_total?: number;
  query_time_in_millis?: number;
  docs_count?: number;
  docs_deleted?: number;
  docs_total_size_in_bytes?: number;
}

export interface Index {
  index_name: string;
  ilm_policy?: string;
}

export interface DataStreams {
  items: DataStream[];
}
export interface DataStream {
  datastream_name: string;
  indices?: Index[];
}
