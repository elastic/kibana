/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This types are the response from Serverless only internal metering API.
 */
interface MeteringStats {
  name: string;
  num_docs: number;
  size_in_bytes: number;
  datastream?: string;
}

export interface MeteringStatsResponse {
  _total: Pick<MeteringStats, 'num_docs' | 'size_in_bytes'>;
  indices: MeteringStats[];
  datastreams?: Omit<MeteringStats, 'datastream'>[];
}
