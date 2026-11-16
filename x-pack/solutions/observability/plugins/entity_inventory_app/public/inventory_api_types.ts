/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: these types mimic the responses of the `types` and values routes. Replace them with the types the server exposes, whose definitions carry the sources in a `dynamic` block, in https://github.com/elastic/observability-dev/issues/6355

export interface EntityInventoryTypeAttribute {
  name: string;
  // TODO: check if the backend returns a label, or if labels need translating client side
  label?: string;
  dimension?: boolean;
}

export interface EntityInventoryTypeSource {
  indexPattern: string;
}

export interface EntityInventoryTypeDefinition {
  type: string;
  name: string;
  category?: string;
  sources: EntityInventoryTypeSource[];
  attributes: EntityInventoryTypeAttribute[];
}

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
