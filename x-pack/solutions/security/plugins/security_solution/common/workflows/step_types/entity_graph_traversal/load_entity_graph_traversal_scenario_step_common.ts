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
  traversalHopSchema,
  traversalLimitOverridesSchema,
  traversalLimitsSchema,
  traversalStopConditionSchema,
  traversalStopConditionsSchema,
} from './entity_graph_traversal_common';

export const loadEntityGraphTraversalScenarioInputSchema = lazySchema(() =>
  z.object({
    scenario_id: z
      .string()
      .min(1)
      .max(128)
      .describe('Id of a shipped traversal scenario, for example okta-user-to-aws-resources'),
    overrides: traversalLimitOverridesSchema
      .optional()
      .describe(
        'Per-run limit overrides. Each value is clamped to the hard ceiling; omitted or empty values keep the scenario default.'
      ),
    until: traversalStopConditionsSchema().describe(
      'Stop conditions for this run, added to the ones the scenario declares.'
    ),
  })
);

export const loadEntityGraphTraversalScenarioOutputSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    seed: z.object({ type: z.string(), description: z.string().optional() }),
    limits: traversalLimitsSchema,
    hops: z.array(traversalHopSchema),
    /** The scenario's stop conditions followed by the run's. */
    until: z.array(traversalStopConditionSchema),
  })
);

export const loadEntityGraphTraversalScenarioStepCommonDefinition: BaseStepDefinition<
  typeof loadEntityGraphTraversalScenarioInputSchema,
  typeof loadEntityGraphTraversalScenarioOutputSchema
> = {
  id: 'security.loadEntityGraphTraversalScenario',
  label: i18n.translate(
    'xpack.securitySolution.workflows.steps.loadEntityGraphTraversalScenario.label',
    { defaultMessage: 'Load Entity Graph Traversal Scenario' }
  ),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.loadEntityGraphTraversalScenario.description',
    {
      defaultMessage:
        'Load a shipped entity graph traversal scenario by id, apply per-run limit overrides clamped to hard ceilings, and expand its hop list into the plan the traversal workflow executes.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: loadEntityGraphTraversalScenarioInputSchema,
  outputSchema: loadEntityGraphTraversalScenarioOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.loadEntityGraphTraversalScenario.documentation.details',
      {
        defaultMessage:
          'Scenarios are YAML definitions shipped with Kibana. Each one is an ordered list of hops; a hop names an index, the field the current frontier of ids is matched against, and the fields that yield the next frontier. ' +
          'The step resolves the effective limits (hard ceiling, then default, then the scenario value, then the override), unrolls hops that declare a repeat count, and truncates the list to max_hops. ' +
          'Use the output hops and limits with security.runEntityGraphTraversalHop inside a while loop.',
      }
    ),
    examples: [
      `## Load a scenario with a smaller hop budget
\`\`\`yaml
- name: load_scenario
  type: security.loadEntityGraphTraversalScenario
  with:
    scenario_id: okta-user-to-aws-resources
    overrides:
      max_hops: 4
      max_nodes: 500
\`\`\``,
    ],
  },
};
