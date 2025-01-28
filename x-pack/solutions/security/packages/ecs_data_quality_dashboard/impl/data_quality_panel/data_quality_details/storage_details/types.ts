/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LegendItem {
  color: string | null;
  ilmPhase: string | null;
  index: string | null;
  pattern: string;
  sizeInBytes: number | undefined;
  docsCount: number;
}

export interface FlattenedBucket {
  ilmPhase: string | undefined;
  incompatible: number | undefined;
  indexName: string | undefined;
  pattern: string;
  sizeInBytes: number | undefined;
  docsCount: number;
}
