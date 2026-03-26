/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { CatalogQuery } from '@kbn/data-source-catalog';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { formatCatalogContextForPrompt } from '../../../../data_source_catalog/catalog_tools/format_catalog_context';
import type { RuleCreationState } from '../state';

interface DiscoverDataSourcesNodeParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  events?: ToolEventEmitter;
}

export const getDiscoverDataSourcesNode = ({
  esClient,
  logger,
  events,
}: DiscoverDataSourcesNodeParams) => {
  return async (state: RuleCreationState) => {
    events?.reportProgress('Discovering available data sources...');

    try {
      const catalogQuery = new CatalogQuery(esClient);
      const result = await catalogQuery.search({
        searchText: state.userQuery,
        activeOnly: true,
        size: 10,
      });

      const catalogContext = formatCatalogContextForPrompt(result.entries);

      if (catalogContext) {
        events?.reportProgress(
          `Found ${result.entries.length} relevant data source(s) for query context`
        );
      } else {
        events?.reportProgress('No matching data sources found in catalog');
      }

      return { catalogContext };
    } catch (error) {
      // If catalog query fails, proceed without context (non-blocking)
      logger.warn(`Failed to query data source catalog: ${error}`);
      return { catalogContext: '' };
    }
  };
};
