/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';
import type { ProcessedEntityRecord } from './types';

interface EsqlColumn {
  name: string;
  type: string;
}

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

export function postProcessEsqlResults(
  columns: EsqlColumn[],
  values: unknown[][],
  entityType: EntityType
): ProcessedEntityRecord[] {
  return values.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      record[col.name] = row[idx];
    });

    return {
      entityId: toStringArray(record.actorUserId)[0] ?? null,
      entityType,
      communicates_with: { ids: toStringArray(record.communicates_with) },
    };
  });
}
