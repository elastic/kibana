/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig, ProcessedEngineRecord } from './types';

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

export const parseTargetsPerActorRows = (
  columns: EsqlColumn[],
  values: unknown[][],
  config: Pick<RelationshipIntegrationConfig, 'relationshipType' | 'enableFrequencyClassification'>
): ProcessedEngineRecord[] => {
  return values.map((row): ProcessedEngineRecord => {
    const record: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      record[col.name] = row[idx];
    });

    const actorUserId = record.actorUserId != null ? String(record.actorUserId) : null;

    if (config.enableFrequencyClassification) {
      return {
        entityId: actorUserId,
        entityType: 'user' as const,
        relationships: {
          accesses_frequently: toStringArray(record.accesses_frequently),
          accesses_infrequently: toStringArray(record.accesses_infrequently),
        },
      };
    }

    return {
      entityId: actorUserId,
      entityType: 'user' as const,
      relationships: {
        [config.relationshipType]: toStringArray(record[config.relationshipType]),
      },
    };
  });
};
