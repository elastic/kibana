/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipType, ProcessedEngineRecord } from './types';

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

/**
 * Maps raw ES|QL result rows to ProcessedEngineRecord objects.
 *
 * For 'accesses': expects columns actorUserId, accesses_frequently, accesses_infrequently.
 * For 'communicates_with': expects columns actorUserId, communicates_with.
 *
 * Target EUIDs are stored in raw_identifiers['entity.id'] — NOT in ids.
 * The relationship resolver validates them against the entity store later.
 */
export const postprocessEsqlResults = (
  columns: EsqlColumn[],
  values: unknown[][],
  relationshipType: RelationshipType
): ProcessedEngineRecord[] => {
  return values.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      record[col.name] = row[idx];
    });

    const actorUserId = record.actorUserId != null ? String(record.actorUserId) : null;

    if (relationshipType === 'accesses') {
      return {
        entityId: actorUserId,
        entityType: 'user' as const,
        relationships: {
          accesses_frequently: { 'entity.id': toStringArray(record.accesses_frequently) },
          accesses_infrequently: { 'entity.id': toStringArray(record.accesses_infrequently) },
        },
      };
    }

    return {
      entityId: actorUserId,
      entityType: 'user' as const,
      relationships: {
        communicates_with: { 'entity.id': toStringArray(record.communicates_with) },
      },
    };
  });
};
