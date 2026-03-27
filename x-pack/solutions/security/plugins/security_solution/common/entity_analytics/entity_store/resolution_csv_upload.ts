/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ResolutionCsvUploadRowResponse {
  status: 'success' | 'unmatched' | 'error';
  matchedEntities: number;
  linkedEntities: number;
  skippedEntities: number;
  error?: string;
}

export interface ResolutionCsvUploadResponse {
  total: number;
  successful: number;
  failed: number;
  unmatched: number;
  items: ResolutionCsvUploadRowResponse[];
}
