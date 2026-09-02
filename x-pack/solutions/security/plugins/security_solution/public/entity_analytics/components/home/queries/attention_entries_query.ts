/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HIGH_CRITICAL_SCORE_THRESHOLD = 70;
export const MAX_ATTENTION_ENTRIES = 10;

export const buildAttentionEntriesQuery = (index: string, watchlistId?: string): string =>
  [
    `FROM ${index}`,
    `| WHERE entity.EngineMetadata.Type IN ("user", "host", "service")`,
    `  AND entity.risk.calculated_score_norm >= ${HIGH_CRITICAL_SCORE_THRESHOLD}`,
    ...(watchlistId
      ? [`  AND MV_CONTAINS(entity.attributes.watchlists, "${watchlistId}")`]
      : []),
    `| SORT entity.risk.calculated_score_norm DESC`,
    `| LIMIT ${MAX_ATTENTION_ENTRIES}`,
    `| KEEP entity.id, entity.name, \`entity.EngineMetadata.Type\`, entity.risk.calculated_score_norm, asset.criticality`,
  ].join('\n');
