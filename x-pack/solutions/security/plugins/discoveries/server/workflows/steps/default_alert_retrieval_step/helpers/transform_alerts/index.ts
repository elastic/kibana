/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAnonymizedValue,
  getRawDataOrDefault,
  transformRawData,
} from '@kbn/elastic-assistant-common';
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Converts an ES|QL result row (array of values) to the raw data format
 * expected by transformRawData (Record<string, unknown[]>).
 */
export const convertEsqlRowToRawData = ({
  columns,
  row,
}: {
  columns: Array<{ name?: string }>;
  row: unknown[];
}): Record<string, unknown[]> => {
  const rawData: Record<string, unknown[]> = {};
  for (let i = 0; i < columns.length; i++) {
    const columnName = columns[i].name ?? `column_${i}`;
    const value = row[i];
    rawData[columnName] = value != null ? [value] : [];
  }
  return rawData;
};

/**
 * Retrieves and anonymizes alerts using an ES|QL query.
 */
export const getAnonymizedAlertsFromEsql = async ({
  anonymizationFields,
  esClient,
  esqlQuery,
  onNewReplacements,
  replacements,
}: {
  anonymizationFields: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  esqlQuery: string;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> => {
  const response = await esClient.esql.query({
    allow_partial_results: true,
    drop_null_columns: true,
    query: esqlQuery,
  });

  const { columns, values } = response;

  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };
    onNewReplacements?.(localReplacements);
  };

  return values.map((row) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements,
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements,
      rawData: getRawDataOrDefault(convertEsqlRowToRawData({ columns, row })),
    })
  );
};

/**
 * Ensure required fields exist in anonymization configuration.
 *
 * The Attack Discovery pipeline relies on the alert `_id` being present in the
 * anonymized alert strings so downstream steps (generation + validation) can
 * reference *real* alert IDs for hallucination detection and persistence.
 */
export const ensureRequiredAnonymizationFields = (
  fields: AnonymizationFieldResponse[]
): AnonymizationFieldResponse[] => {
  const hasIdField = fields.some((field) => field.field === '_id');
  if (hasIdField) {
    return fields;
  }

  return [
    {
      allowed: true,
      anonymized: false,
      field: '_id',
      id: 'field-_id',
    },
    ...fields,
  ];
};
