/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessedEntityRecord } from './types';

interface EsqlColumn {
  name: string;
  type: string;
}

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value as string];
}

export function postprocessEsqlResults(
  columns: EsqlColumn[],
  values: unknown[][]
): ProcessedEntityRecord[] {
  return values.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      record[col.name] = row[idx];
    });

    return {
      entityId: record.actorUserId as string,
      accesses_frequently: toStringArray(record.accesses_frequently),
      accesses_infrequently: toStringArray(record.accesses_infrequently),
    };
  });
}
