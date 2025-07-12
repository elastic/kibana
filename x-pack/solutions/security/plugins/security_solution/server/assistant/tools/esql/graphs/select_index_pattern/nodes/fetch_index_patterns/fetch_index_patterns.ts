/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SelectIndexPatternAnnotation } from '../../state';
import { buildTree, getIndexPatterns } from './utils';

export const fetchIndexPatterns = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return async (state: typeof SelectIndexPatternAnnotation.State) => {
    try {
      const indicesResolveIndexResponse = await esClient.indices.resolveIndex(
        {
          name: '*',
          expand_wildcards: 'open',
        },
        {
          requestTimeout: 20000, // 30 seconds
        }
      );

      // Stores indices that do not have any datastreams or aliases
      const indicesWithoutDatastreamsOrAliases = new Set<string>();
      const seenIndices = new Set<string>();
      const dataStreamsAndAliases = new Set<string>();

      // Collect all indices from data streams and aliases
      for (const dataStream of indicesResolveIndexResponse.data_streams) {
        for (const index of dataStream.backing_indices) {
          seenIndices.add(index);
        }
        dataStreamsAndAliases.add(dataStream.name);
      }

      for (const alias of indicesResolveIndexResponse.aliases) {
        for (const index of alias.indices) {
          seenIndices.add(index);
        }
        dataStreamsAndAliases.add(alias.name);
      }

      // Add indices that do not have any datastreams or aliases
      for (const index of indicesResolveIndexResponse.indices) {
        if (!seenIndices.has(index.name)) {
          indicesWithoutDatastreamsOrAliases.add(index.name);
        }
      }

      const indexNamePartRootNode = buildTree([
        ...indicesWithoutDatastreamsOrAliases,
        ...dataStreamsAndAliases,
      ]);

      const constructedIndexPatterns = getIndexPatterns(indexNamePartRootNode, {
        ignoreDigitParts: true,
      });

      const indexPatterns = new Set<string>();

      // Add any index patterns that could be constructed from the indices
      for (const indexPattern of constructedIndexPatterns.indexPatterns) {
        indexPatterns.add(indexPattern);
      }

      // Add any remaining indices that did not match any patterns
      for (const remainingIndex of constructedIndexPatterns.remainingIndices) {
        indexPatterns.add(remainingIndex);
      }

      return new Command({
        update: {
          indexPatterns: Array.from(indexPatterns),
        },
      });
    } catch (error) {
      return new Command({
        update: {
          indexPatterns: [],
        },
      });
    }
  };
};
