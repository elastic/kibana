/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

// Function copied from elasticsearch-8.x/lib/helpers
export function esqlResponseToRecords<TDocument extends Record<string, unknown>>(
  response: ESQLSearchResponse | undefined
): TDocument[] {
  if (!response) return [];
  const { columns, values } = response;
  return values.map<TDocument>((row) => {
    const doc: Record<string, unknown> = {};
    row.forEach((cell, index) => {
      const { name } = columns[index];
      doc[name] = cell;
    });
    return doc as TDocument;
  });
}
