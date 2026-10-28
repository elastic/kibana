/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { traceEntityGraphTraversalRoutesStepDefinition } from './trace_entity_graph_traversal_routes_step';
import { traceEntityGraphTraversalRoutesInputSchema } from '../../../../common/workflows/step_types/entity_graph_traversal/trace_entity_graph_traversal_routes_step_common';

const edge = (hop: number, source: string, target: string) => ({
  hop,
  relation: 'r',
  source,
  target,
  count: 1,
});

const createContext = (rawInput: Record<string, unknown>) =>
  ({
    input: traceEntityGraphTraversalRoutesInputSchema.parse(rawInput),
    config: {},
    rawInput,
    contextManager: {},
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'trace_routes',
    stepType: traceEntityGraphTraversalRoutesStepDefinition.id,
  } as unknown as StepHandlerContext);

describe('security.traceEntityGraphTraversalRoutes', () => {
  it('returns the route from the seed to each target and skips unreachable ones', async () => {
    const result = await traceEntityGraphTraversalRoutesStepDefinition.handler(
      createContext({
        seed_id: 'user:a',
        edges: [edge(1, 'user:a', 'role-1'), edge(2, 'role-1', 'bucket-1'), edge(1, 'x', 'y')],
        targets: ['bucket-1', 'y'],
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.output?.routes).toEqual([
      { id: 'bucket-1', route: ['user:a', 'role-1', 'bucket-1'] },
    ]);
  });
});
