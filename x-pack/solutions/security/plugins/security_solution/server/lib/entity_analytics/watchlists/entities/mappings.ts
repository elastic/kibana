/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

// TODO: Expand mappings as the watchlist entity doc schema evolves
export const WATCHLIST_ENTITY_INDEX_MAPPING: MappingProperties = {
  '@timestamp': {
    type: 'date',
  },
  'event.ingested': {
    type: 'date',
  },
  'user.name': {
    type: 'keyword',
  },
  'labels.sources': {
    type: 'keyword',
  },
  'labels.source_ids': {
    type: 'keyword',
  },
};

export const generateWatchlistEntityIndexMappings = (): MappingTypeMapping => ({
  properties: WATCHLIST_ENTITY_INDEX_MAPPING,
});
