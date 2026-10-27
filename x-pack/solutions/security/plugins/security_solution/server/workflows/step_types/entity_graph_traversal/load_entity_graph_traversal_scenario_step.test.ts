/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { loadEntityGraphTraversalScenarioStepDefinition } from './load_entity_graph_traversal_scenario_step';
import { loadEntityGraphTraversalScenarioInputSchema } from '../../../../common/workflows/step_types/entity_graph_traversal/load_entity_graph_traversal_scenario_step_common';

const createContext = (rawInput: unknown): StepHandlerContext =>
  ({
    input: loadEntityGraphTraversalScenarioInputSchema.parse(rawInput),
    config: {},
    rawInput,
    contextManager: {
      getContext: jest.fn().mockReturnValue({}),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'load_scenario',
    stepType: loadEntityGraphTraversalScenarioStepDefinition.id,
  } as unknown as StepHandlerContext);

describe('security.loadEntityGraphTraversalScenario', () => {
  it('loads a shipped scenario and expands its hops', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'okta-user-to-aws-resources' })
    );
    expect(result.error).toBeUndefined();
    expect(result.output).toMatchObject({
      id: 'okta-user-to-aws-resources',
      limits: { max_hops: 6 },
    });
    expect(result.output?.hops).toHaveLength(6);
    expect(result.output?.hops[0]).toMatchObject({
      hop_number: 1,
      name: 'okta_federation_roles',
      match_euid: 'user',
    });
  });

  it('treats empty template values as unset and clamps overrides to the ceilings', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({
        scenario_id: 'okta-user-to-aws-resources',
        overrides: { max_hops: 2, max_nodes: '', max_frontier: 999999, hub_degree: undefined },
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.output?.hops).toHaveLength(2);
    expect(result.output?.limits).toMatchObject({
      max_hops: 2,
      max_nodes: 2000,
      max_frontier: 1000,
      hub_degree: 500,
    });
  });

  it('fails with the list of available scenarios for an unknown id', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'nope' })
    );
    expect(result.output).toBeUndefined();
    expect(result.error?.message).toContain('Unknown entity graph traversal scenario "nope"');
    expect(result.error?.message).toContain('okta-user-to-aws-resources');
  });
});
