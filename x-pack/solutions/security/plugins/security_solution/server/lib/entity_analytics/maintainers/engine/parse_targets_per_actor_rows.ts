/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

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

/**
 * Safety net for developer-provided `esqlQueryOverride` configs.
 *
 * Overrides are required to emit a fixed set of column names (see the column
 * contract documented on `RelationshipIntegrationConfig.esqlQueryOverride`).
 * If they don't, every row below silently parses as null/empty and the engine
 * produces zero records — a slow, silent failure that's painful to debug.
 *
 * This emits a single actionable warning naming the missing columns. It only
 * runs on the override path because the default builder generates the columns
 * itself and cannot drift.
 */
type ParseConfig = Pick<
  RelationshipIntegrationConfig,
  'id' | 'relationshipType' | 'bucketTargetByThreshold' | 'esqlQueryOverride'
>;

function warnIfOverrideColumnsMissing(
  columns: EsqlColumn[],
  config: ParseConfig,
  logger: Logger
): void {
  if (!config.esqlQueryOverride) return;
  const colNames = new Set(columns.map((c) => c.name));
  const expected = config.bucketTargetByThreshold
    ? [
        'actorUserId',
        config.bucketTargetByThreshold.aboveThresholdRelationship,
        config.bucketTargetByThreshold.belowThresholdRelationship,
      ]
    : ['actorUserId', config.relationshipType];
  const missing = expected.filter((n) => !colNames.has(n));
  if (missing.length > 0) {
    logger.warn(
      `[${config.id}] esqlQueryOverride is missing expected columns: ${missing.join(
        ', '
      )} — results will be empty`
    );
  }
}

export const parseTargetsPerActorRows = (
  columns: EsqlColumn[],
  values: unknown[][],
  config: ParseConfig,
  logger: Logger
): ProcessedEngineRecord[] => {
  warnIfOverrideColumnsMissing(columns, config, logger);

  return values.map((row): ProcessedEngineRecord => {
    const record: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      record[col.name] = row[idx];
    });

    const actorUserId = record.actorUserId != null ? String(record.actorUserId) : null;

    // TODO(follow-up): entityType hardcoded to 'user' — use actorEntityType from config.
    if (config.bucketTargetByThreshold) {
      const { aboveThresholdRelationship: above, belowThresholdRelationship: below } =
        config.bucketTargetByThreshold;
      return {
        entityId: actorUserId,
        entityType: 'user' as const,
        relationships: {
          [above]: toStringArray(record[above]),
          [below]: toStringArray(record[below]),
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
