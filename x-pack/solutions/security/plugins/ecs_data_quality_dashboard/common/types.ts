/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface MeteringStatsIndex {
  uuid?: string;
  name: string;
  num_docs: number | null;
  size_in_bytes: number | null;
  data_stream?: string;
}

export interface MeteringIndicesStatsResponse {
  _shards: {
    total: number;
    successful: number;
    failed: number;
  };
  indices: MeteringStatsIndex[] | null | undefined;
  datastreams: Array<{ name: string; num_docs: number }>;
  total: {
    num_docs: number;
  };
}
