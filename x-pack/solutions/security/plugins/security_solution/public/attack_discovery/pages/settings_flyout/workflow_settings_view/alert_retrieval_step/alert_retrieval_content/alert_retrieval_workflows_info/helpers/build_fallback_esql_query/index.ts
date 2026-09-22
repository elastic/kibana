/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_SPACE_ID = 'default';
const DEFAULT_SIZE = 100;

/**
 * Builds a generic, valid default ES|QL query for retrieving security alerts in
 * the given space. Used only as a fallback when the server-built default query
 * (which derives a space-specific KEEP clause) cannot be fetched, so the
 * example workflow still embeds a runnable, space-correct query.
 *
 * Mirrors the shape of the server-side default query (see `buildDefaultEsqlQuery`)
 * minus the dynamic KEEP clause.
 */
export const buildFallbackEsqlQuery = ({ spaceId }: { spaceId?: string }): string => {
  const index = `.alerts-security.alerts-${spaceId ?? DEFAULT_SPACE_ID}`;

  return [
    `FROM ${index}`,
    '    METADATA _id',
    '  | WHERE @timestamp >= NOW() - 24 hours',
    '  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")',
    '  | WHERE kibana.alert.building_block_type IS NULL',
    '  | SORT kibana.alert.risk_score DESC, @timestamp DESC',
    `  | LIMIT ${DEFAULT_SIZE}`,
  ].join('\n');
};
