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
import { resolvedTraversalNodeSchema, traversalNodeSchema } from './entity_graph_traversal_common';

const MAX_NODES = 10_000;

export const resolveEntityGraphTraversalNodesInputSchema = lazySchema(() =>
  z.object({
    nodes: z
      .array(traversalNodeSchema)
      .max(MAX_NODES)
      .describe('The nodes a traversal admitted, seed included'),
  })
);

export const resolveEntityGraphTraversalNodesOutputSchema = lazySchema(() =>
  z.object({
    nodes: z.array(resolvedTraversalNodeSchema),
    stats: z.object({
      requested: z.number().int(),
      resolved: z.number().int(),
      unresolved: z.number().int(),
      aliases: z.number().int(),
      queries: z.number().int(),
    }),
  })
);

export const resolveEntityGraphTraversalNodesStepCommonDefinition: BaseStepDefinition<
  typeof resolveEntityGraphTraversalNodesInputSchema,
  typeof resolveEntityGraphTraversalNodesOutputSchema
> = {
  id: 'security.resolveEntityGraphTraversalNodes',
  label: i18n.translate(
    'xpack.securitySolution.workflows.steps.resolveEntityGraphTraversalNodes.label',
    { defaultMessage: 'Resolve Entity Graph Traversal Nodes' }
  ),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.resolveEntityGraphTraversalNodes.description',
    {
      defaultMessage:
        'Look the nodes of an entity graph traversal up in the Entity Store of the execution space and annotate each with its EUID, whether the store knows it, the canonical entity it resolves to, and the stored name, type, criticality and risk.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: resolveEntityGraphTraversalNodesInputSchema,
  outputSchema: resolveEntityGraphTraversalNodesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.resolveEntityGraphTraversalNodes.documentation.details',
      {
        defaultMessage:
          'Node ids are matched against entity.id in the latest entity index of the execution space, in chunks passed as ES|QL parameters. ' +
          'Seeds are EUIDs and generic entities (cloud assets) use their entity.id as EUID, so a node resolves when the store has an entity with that id. ' +
          'A node the store does not know keeps its id as euid with resolved: false. When the stored entity carries entity.relationships.resolution.resolved_to, that id is returned as canonical_euid.',
      }
    ),
    examples: [
      `## Annotate the traversed nodes before emitting the result
\`\`\`yaml
- name: resolve_nodes
  type: security.resolveEntityGraphTraversalNodes
  with:
    nodes: "\${{ variables.nodes }}"
\`\`\``,
    ],
  },
};
