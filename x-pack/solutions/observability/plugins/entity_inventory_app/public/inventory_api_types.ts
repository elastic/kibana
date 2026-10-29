/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntityInventoryTypeAttribute {
  name: string;
  dimension?: boolean;
}

export interface EntityInventoryTypeDefinition {
  type: string;
  name: string;
  category?: string;
  attributes: EntityInventoryTypeAttribute[];
}

export interface EntityInventoryAttributeValuesParams {
  attribute: string;
  types: string[];
  filters: Record<string, string[]>;
  timeRange: { from: string; to: string };
}
