/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: the values types mimic the response of the values route. Replace them with the types the server exposes in https://github.com/elastic/observability-dev/issues/6355

export interface EntityInventoryAttributeValuesParams {
  attribute: string;
  types: string[];
  filters: Record<string, string[]>;
  selected: string[];
  timeRange: { from: string; to: string };
}

export interface EntityInventoryAttributeValuesResponse {
  values: string[];
  invalidSelections: string[];
}
