/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { runEntityGraphTraversalHopStepCommonDefinition } from '../../../../common/workflows/step_types/entity_graph_traversal/run_entity_graph_traversal_hop_step_common';
import { runHop, type EsqlResult, type ExecuteHopQuery } from './run_hop';

export const runEntityGraphTraversalHopStepDefinition = createServerStepDefinition({
  ...runEntityGraphTraversalHopStepCommonDefinition,
  handler: async (context) => {
    const {
      hop,
      frontier,
      visited,
      edges_so_far,
      truncated_so_far,
      limits,
      lookback,
      exclusions,
      until,
    } = context.input;
    const esClient = context.contextManager.getScopedEsClient();
    const { logger, abortSignal } = context;

    const execute: ExecuteHopQuery = async ({ query, params }) => {
      logger.debug(
        `entity graph traversal hop ${hop.hop_number} (${hop.name}): ${params.length} frontier ids, query:\n${query}`
      );
      const response = await esClient.esql.query(
        { query, params, drop_null_columns: false },
        { signal: abortSignal }
      );
      // The client types ES|QL responses loosely; guard the shape before parsing.
      const typed = response as unknown as Partial<EsqlResult>;
      if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
        throw new Error(
          `Hop "${hop.name}" ES|QL response did not contain columns and values arrays`
        );
      }
      return { columns: typed.columns, values: typed.values };
    };

    try {
      const output = await runHop(
        {
          hop,
          frontier,
          visited,
          edgesSoFar: edges_so_far,
          truncatedSoFar: truncated_so_far,
          limits,
          lookback,
          exclusions,
          until,
        },
        execute
      );
      logger.debug(
        `entity graph traversal hop ${hop.hop_number} (${hop.name}): ${output.stats.edges_added} edges, ${output.stats.new_nodes} new nodes, stop_reason="${output.stop_reason}"`
      );
      return { output };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
