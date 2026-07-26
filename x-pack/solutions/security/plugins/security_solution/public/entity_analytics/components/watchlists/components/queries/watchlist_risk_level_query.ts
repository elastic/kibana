/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getWatchlistRiskLevelsQueryBodyV2 = (watchlistId?: string) => `
| WHERE  entity.EngineMetadata.Type IN ("user", "host", "service")${
  watchlistId ? ` AND MV_CONTAINS(entity.attributes.watchlists, "${watchlistId}")` : ''
}
| STATS count = COUNT(*) BY entity.risk.calculated_level
| RENAME entity.risk.calculated_level AS level`;
