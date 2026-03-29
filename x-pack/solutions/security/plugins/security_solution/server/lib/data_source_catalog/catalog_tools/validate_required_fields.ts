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
 * matching the given index patterns. Returns advisory results --
 * does not block rule activation.
 */
export const validateRequiredFields = async (
  esClient: ElasticsearchClient,
  indexPatterns: string[],
  requiredFields: RequiredField[]
): Promise<FieldValidationResult[]> => {
  if (requiredFields.length === 0 || indexPatterns.length === 0) {
    return [];
  }

  const catalogQuery = new CatalogQuery(esClient);
  const results: FieldValidationResult[] = [];

  for (const field of requiredFields) {
    const catalogResult = await catalogQuery.search({
      namePattern: indexPatterns[0],
      hasFields: [field.name],
      size: 5,
    });

    results.push({
      field,
      exists: catalogResult.entries.length > 0,
      matchedIndices: catalogResult.entries.map((entry) => entry.name),
    });
  }

  return results;
};
