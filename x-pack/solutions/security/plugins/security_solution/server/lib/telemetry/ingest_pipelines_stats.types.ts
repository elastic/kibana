/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NodeIngestPipelinesStats {
  name: string;
  totals: Totals;
  pipelines: Pipeline[];
}

export interface Pipeline {
  name: string;
  totals: Totals;
  processors: Processor[];
}

export interface Processor {
  name: string;
  totals: Totals;
}

export interface Totals {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}
