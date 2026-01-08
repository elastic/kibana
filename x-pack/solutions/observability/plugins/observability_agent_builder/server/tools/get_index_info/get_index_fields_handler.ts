/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { compact, groupBy, mapValues } from 'lodash';
import { selectRelevantFields, type FieldWithType } from './select_relevant_fields';
import { getFieldType } from './utils';

export interface IndexFieldsResult {
  fieldsByType: Record<string, string[]>;
  totalFields: number;
  filtered?: boolean;
  [key: string]: unknown;
}

/** Threshold above which LLM filtering is applied */
const LLM_FILTER_THRESHOLD = 100;

/**
 * Returns all fields from a specific index pattern, grouped by type.
 * When userIntentDescription is provided and field count exceeds threshold, uses LLM to filter.
 */
export async function getIndexFieldsHandler({
  esClient,
  index,
  userIntentDescription,
  modelProvider,
  logger,
}: {
  esClient: IScopedClusterClient;
  index: string;
  userIntentDescription?: string;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<IndexFieldsResult> {
  try {
    const response = await esClient.asCurrentUser.fieldCaps({
      index,
      fields: ['*'],
      ignore_unavailable: true,
      allow_no_indices: true,
      filters: '-metadata',
    });

    // Filter out internal fields
    let fieldsWithTypes: FieldWithType[] = compact(
      Object.entries(response.fields)
        .filter(([fieldName]) => !fieldName.startsWith('_'))
        .map(([fieldName, fieldTypes]): FieldWithType | undefined => {
          const type = getFieldType(fieldTypes);
          return type ? { name: fieldName, type } : undefined;
        })
    );

    const totalFields = fieldsWithTypes.length;

    if (fieldsWithTypes.length > LLM_FILTER_THRESHOLD) {
      if (!userIntentDescription) {
        return {
          fieldsByType: {},
          totalFields,
          error: `Index has ${totalFields} fields which exceeds the threshold of ${LLM_FILTER_THRESHOLD}. Provide 'userIntentDescription' to filter to relevant fields.`,
        };
      }

      const { inferenceClient } = await modelProvider.getDefaultModel();
      fieldsWithTypes = await selectRelevantFields({
        userIntentDescription,
        candidateFields: fieldsWithTypes,
        inferenceClient,
        logger,
      });
    }

    // Group field names by type
    const fieldsGroupedByType = groupBy(fieldsWithTypes, ({ type }) => type);
    const fieldsByType = mapValues(fieldsGroupedByType, (fields) => fields.map((f) => f.name));

    return {
      fieldsByType,
      totalFields,
      filtered: totalFields > fieldsWithTypes.length,
    };
  } catch {
    return { fieldsByType: {}, totalFields: 0 };
  }
}
