/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { getIndexPatternLookup } from '../../configurations';

const LOOKUP_INDEX_MAPPING: MappingTypeMapping = {
  properties: {
    entity_id: { type: 'keyword' },
    resolution_target_id: { type: 'keyword' },
    propagation_target_id: { type: 'keyword' },
    relationship_type: { type: 'keyword' },
    '@timestamp': { type: 'date' },
  },
};

export const getLookupIndexName = (namespace: string): string =>
  getIndexPatternLookup(namespace).alias;

export const ensureLookupIndex = async ({
  esClient,
  namespace,
}: {
  esClient: ElasticsearchClient;
  namespace: string;
}): Promise<string> => {
  const lookupIndex = getLookupIndexName(namespace);
  const exists = await esClient.indices.exists({ index: lookupIndex });

  if (!exists) {
    try {
      await esClient.indices.create({
        index: lookupIndex,
        settings: {
          'index.mode': 'lookup',
        },
        mappings: LOOKUP_INDEX_MAPPING,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('resource_already_exists_exception')) {
        throw error;
      }
    }
  }

  return lookupIndex;
};
