/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getLatestEntityIndexPattern } from '@kbn/entity-store/common';
import { resolveEntityGraphTraversalNodesStepCommonDefinition } from '../../../../common/workflows/step_types/entity_graph_traversal/resolve_entity_graph_traversal_nodes_step_common';
import { resolveSpaceId } from '../get_alert_entities_step/resolve_space_id';
import type { EsqlResult } from './run_hop';
import { resolveNodes, type ExecuteResolveQuery } from './resolve_nodes';

export const resolveEntityGraphTraversalNodesStepDefinition = createServerStepDefinition({
  ...resolveEntityGraphTraversalNodesStepCommonDefinition,
  handler: async (context) => {
    const { nodes } = context.input;
    const esClient = context.contextManager.getScopedEsClient();
    const { logger, abortSignal } = context;

    const execute: ExecuteResolveQuery = async ({ query, params }) => {
      logger.debug(`entity graph traversal resolve: ${params.length} node ids, query:\n${query}`);
      const response = await esClient.esql.query(
        { query, params, drop_null_columns: false },
        { signal: abortSignal }
      );
      const typed = response as unknown as Partial<EsqlResult>;
      if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
        throw new Error('Resolve ES|QL response did not contain columns and values arrays');
      }
      return { columns: typed.columns, values: typed.values };
    };

    try {
      const spaceId = await resolveSpaceId(context.contextManager);
      const output = await resolveNodes(
        { nodes, indexPattern: getLatestEntityIndexPattern(spaceId) },
        execute
      );
      logger.debug(
        `entity graph traversal resolve: ${output.stats.resolved}/${output.stats.requested} nodes found in the entity store of space "${spaceId}", ${output.stats.aliases} aliases`
      );
      return { output };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
