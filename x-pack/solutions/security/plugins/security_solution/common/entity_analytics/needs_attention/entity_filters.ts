/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../types';
import type { RiskSeverity } from '../../search_strategy';

export interface EntityFilters {
  entityTypes: EntityType[];
  riskLevels: RiskSeverity[];
  assetCriticality: string[];
  watchlists: string[];
  dataSources: string[];
}

export const ENTITY_FILTER_FIELDS = [
  'entityTypes',
  'riskLevels',
  'assetCriticality',
  'watchlists',
  'dataSources',
] as const satisfies ReadonlyArray<keyof EntityFilters>;

export const ENTITY_FILTER_ES_FIELDS: Record<keyof EntityFilters, string> = {
  entityTypes: 'entity.EngineMetadata.Type',
  riskLevels: 'entity.risk.calculated_level',
  assetCriticality: 'asset.criticality',
  watchlists: 'entity.attributes.watchlists',
  dataSources: 'entity.source',
};

export const EMPTY_ENTITY_FILTERS: EntityFilters = {
  entityTypes: [],
  riskLevels: [],
  assetCriticality: [],
  watchlists: [],
  dataSources: [],
};

const MV_CONTAINS_FIELDS = new Set<keyof EntityFilters>(['watchlists', 'dataSources']);

export const getEntityFilterESQL = (filters: EntityFilters): string[] =>
  ENTITY_FILTER_FIELDS.filter((key) => filters[key].length).map((key) => {
    const field = ENTITY_FILTER_ES_FIELDS[key];
    const values = filters[key] as string[];
    const quoted = values.map((v) => `"${v.replace(/["\\]/g, '\\$&')}"`).join(', ');
    if (MV_CONTAINS_FIELDS.has(key)) {
      return values.length === 1
        ? `| WHERE MV_CONTAINS(${field}, ${quoted})`
        : `| WHERE ${values
            .map((v) => `MV_CONTAINS(${field}, "${v.replace(/["\\]/g, '\\$&')}")`)
            .join(' OR ')}`;
    }
    return `| WHERE ${field} IN (${quoted})`;
  });
