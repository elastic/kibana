/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexMappings } from '@kbn/agent-builder-genai-utils';
import type { GraphNode, TranslatePanelGraphParams } from '../../types';

export const getIndexMappingNode = (params: TranslatePanelGraphParams): GraphNode => {
  return async (state) => {
    if (!state.index_pattern) {
      params.logger.warn('No index pattern available for getting mapping');
      return {};
    }

    try {
      const mappings = await getIndexMappings({
        indices: [state.index_pattern],
        esClient: params.esScopedClient.asInternalUser,
        cleanup: true,
      });

      if (!mappings || Object.keys(mappings).length === 0) {
        params.logger.warn(`No mappings found for index: ${state.index_pattern}`);
        return {};
      }

      return {
        index_mapping: mappings,
      };
    } catch (error) {
      params.logger.error(`Error getting index mapping: ${error}`);
      return {};
    }
  };
};
