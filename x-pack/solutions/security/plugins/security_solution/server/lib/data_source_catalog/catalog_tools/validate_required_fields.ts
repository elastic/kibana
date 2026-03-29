/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CatalogQuery } from '@kbn/data-source-catalog';

interface RequiredField {
  name: string;
  type: string;
  ecs?: boolean;
}

export interface FieldValidationResult {
  field: RequiredField;
  exists: boolean;
  matchedIndices: string[];
}

/**
 * Validates whether required fields exist in the catalog entries
 * matching the given index pattern. Returns advisory results --
 * does not block rule activation.
 */
export async function validateRequiredFields(
  esClient: ElasticsearchClient,
  indexPattern: string,
  requiredFields: RequiredField[]
): Promise<FieldValidationResult[]> {
  if (requiredFields.length === 0 || !indexPattern) {
    return [];
  }

  const catalogQuery = new CatalogQuery(esClient);

  // Single query: find all catalog entries matching the pattern
  const catalogResult = await catalogQuery.search({
    namePattern: indexPattern,
    size: 50,
  });

  // Build a set of all field names across matching entries
  const availableFields = new Set<string>();
  for (const entry of catalogResult.entries) {
    for (const field of entry.mapping.fields) {
      availableFields.add(field.name);
    }
  }

  // Check each required field against the set
  return requiredFields.map((field) => ({
    field,
    exists: availableFields.has(field.name),
    matchedIndices: catalogResult.entries
      .filter((e) => e.mapping.fields.some((f) => f.name === field.name))
      .map((e) => e.name),
  }));
}
