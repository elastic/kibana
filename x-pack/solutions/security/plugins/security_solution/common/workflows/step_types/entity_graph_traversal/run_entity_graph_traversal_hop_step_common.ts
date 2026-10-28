/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  traversalEdgeSchema,
  traversalExclusionsSchema,
  traversalStopConditionsSchema,
  traversalHopSchema,
  traversalIdListSchema,
  traversalLimitsSchema,
  traversalLookbackSchema,
  traversalNodeSchema,
  traversalStopReasonSchema,
} from './entity_graph_traversal_common';

export const runEntityGraphTraversalHopInputSchema = lazySchema(() =>
  z.object({
    hop: traversalHopSchema.describe('One expanded hop from the loaded scenario'),
    frontier: traversalIdListSchema.describe('Ids to expand on this hop'),
    visited: traversalIdListSchema.describe('Ids already admitted, including the seed'),
    edges_so_far: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('Edges accumulated by earlier hops, for the max_edges_total limit'),
    truncated_so_far: z.coerce
      .boolean()
      .default(false)
      .describe('Whether an earlier hop already dropped data'),
    limits: traversalLimitsSchema.describe('Effective limits from the load step'),
    lookback: traversalLookbackSchema().describe(
      'Only consider documents newer than this on hops that declare a time_field, for example 7d'
    ),
    exclusions: traversalExclusionsSchema().describe(
      'Field/values pairs to leave out: documents carrying one of the values are not read, and values on entity.id are removed from the frontier and from the targets'
    ),
    until: traversalStopConditionsSchema().describe(
      'Stop conditions: the hop ends the traversal (stop_reason until_matched) when it admits a node whose id, or whose reaching edge payload, carries one of the values'
    ),
  })
);

export const runEntityGraphTraversalHopOutputSchema = lazySchema(() =>
  z.object({
    hop_number: z.number().int().min(1),
    hop_name: z.string(),
    edges: z.array(traversalEdgeSchema),
    nodes: z.array(traversalNodeSchema),
    next_frontier: z.array(z.string()),
    /** Ids of nodes admitted this hop that matched a stop condition. */
    until_matches: z.array(z.string()),
    visited: z.array(z.string()),
    truncated: z.boolean(),
    stop_reason: traversalStopReasonSchema,
    stats: z.object({
      frontier_size: z.number().int(),
      frontier_expanded: z.number().int(),
      dropped_frontier: z.number().int(),
      queries: z.number().int(),
      rows_returned: z.number().int(),
      edges_added: z.number().int(),
      dropped_edges: z.number().int(),
      excluded_frontier: z.number().int(),
      excluded_edges: z.number().int(),
      until_matched: z.number().int(),
      closing_edges: z.number().int(),
      new_nodes: z.number().int(),
      hubs_skipped: z.array(z.string()),
    }),
  })
);

export const runEntityGraphTraversalHopStepCommonDefinition: BaseStepDefinition<
  typeof runEntityGraphTraversalHopInputSchema,
  typeof runEntityGraphTraversalHopOutputSchema
> = {
  id: 'security.runEntityGraphTraversalHop',
  label: i18n.translate('xpack.securitySolution.workflows.steps.runEntityGraphTraversalHop.label', {
    defaultMessage: 'Run Entity Graph Traversal Hop',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.runEntityGraphTraversalHop.description',
    {
      defaultMessage:
        'Expand one hop of an entity graph traversal: query the hop index for the frontier ids, bound as ES|QL parameters, and return the edges found, the newly reached nodes, and the next frontier, within the run limits.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: runEntityGraphTraversalHopInputSchema,
  outputSchema: runEntityGraphTraversalHopOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.runEntityGraphTraversalHop.documentation.details',
      {
        defaultMessage:
          'For each target field of the hop the step runs one ES|QL query of the form FROM index | WHERE match_field IN (frontier) | MV_EXPAND target | STATS COUNT(*), VALUES(payload) BY source, target | LIMIT max_edges_per_hop. ' +
          'The frontier is passed as query parameters, never interpolated. Frontier ids beyond max_frontier are dropped, a source with more distinct targets than hub_degree is not expanded, and edges or nodes beyond max_edges_total or max_nodes are dropped; every drop sets truncated. ' +
          'stop_reason is non-empty when the traversal cannot continue: the frontier is exhausted or a total cap was reached. Targets already in visited produce closing edges but are not added to the next frontier.',
      }
    ),
    examples: [
      `## Expand the current frontier inside a while loop
\`\`\`yaml
- name: run_hop
  type: security.runEntityGraphTraversalHop
  with:
    hop: "\${{ steps.load_scenario.output.hops[variables.hops_executed] }}"
    frontier: "\${{ variables.frontier }}"
    visited: "\${{ variables.visited }}"
    edges_so_far: "\${{ variables.edges.size }}"
    truncated_so_far: "\${{ variables.truncated }}"
    limits: "\${{ steps.load_scenario.output.limits }}"
    lookback: "{{ inputs.lookback }}"
    exclusions: "\${{ inputs.exclusions }}"
    until: "\${{ steps.load_scenario.output.until }}"
\`\`\``,
    ],
  },
};
