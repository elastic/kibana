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
import { traversalEdgeSchema } from './entity_graph_traversal_common';

const MAX_EDGES = 10_000;
const MAX_TARGETS = 10_000;
const MAX_ID_LENGTH = 2048;

export const traceEntityGraphTraversalRoutesInputSchema = lazySchema(() =>
  z.object({
    seed_id: z.string().min(1).max(MAX_ID_LENGTH).describe('The node the traversal started from'),
    edges: z.array(traversalEdgeSchema).max(MAX_EDGES).describe('Every edge the traversal kept'),
    targets: z
      .array(z.string().min(1).max(MAX_ID_LENGTH))
      .max(MAX_TARGETS)
      .describe('Node ids to trace a route to, typically the nodes that matched a stop condition'),
  })
);

export const traversalRouteSchema = lazySchema(() =>
  z.object({ id: z.string(), route: z.array(z.string()) })
);

export const traceEntityGraphTraversalRoutesOutputSchema = lazySchema(() =>
  z.object({
    routes: z.array(traversalRouteSchema),
  })
);

export const traceEntityGraphTraversalRoutesStepCommonDefinition: BaseStepDefinition<
  typeof traceEntityGraphTraversalRoutesInputSchema,
  typeof traceEntityGraphTraversalRoutesOutputSchema
> = {
  id: 'security.traceEntityGraphTraversalRoutes',
  label: i18n.translate(
    'xpack.securitySolution.workflows.steps.traceEntityGraphTraversalRoutes.label',
    { defaultMessage: 'Trace Entity Graph Traversal Routes' }
  ),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.traceEntityGraphTraversalRoutes.description',
    {
      defaultMessage:
        'Trace the route from the seed of an entity graph traversal to each target node over the edges the traversal kept.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: traceEntityGraphTraversalRoutesInputSchema,
  outputSchema: traceEntityGraphTraversalRoutesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.traceEntityGraphTraversalRoutes.documentation.details',
      {
        defaultMessage:
          'Edges are walked in both directions from the seed and the first route found to a target is a shortest one, as node ids from the seed to the target. A target the edges do not connect to the seed yields no route.',
      }
    ),
    examples: [
      `## Routes to the nodes that matched a stop condition
\`\`\`yaml
- name: trace_routes
  type: security.traceEntityGraphTraversalRoutes
  with:
    seed_id: "{{ inputs.seed_id }}"
    edges: "\${{ variables.edges }}"
    targets: "\${{ variables.until_matches }}"
\`\`\``,
    ],
  },
};
