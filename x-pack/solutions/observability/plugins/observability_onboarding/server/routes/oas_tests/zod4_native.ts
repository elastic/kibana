/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as z4 from 'zod/v4';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

// Recursive schema using z4.lazy (needs ref strategy to resolve)
const RecursiveNode: z4.ZodType<any> = z4.lazy(() =>
  z4
    .object({
      id: z4.string(),
      children: z4.array(RecursiveNode).optional(),
    })
    .meta({
      description: 'A node in a recursive structure, can have children that are also nodes',
      example: {
        id: 'node1',
        children: [{ id: 'node2', children: [] }, { id: 'node3' }],
      },
    })
);

// Intersection + Union - problematic in OAS
const SchemaWithIntersectionUnion = z4.intersection(
  z4.object({ common: z4.string() }),
  z4.union([
    z4.object({ type: z4.literal('A'), valueA: z4.number() }),
    z4.object({ type: z4.literal('B'), valueB: z4.boolean() }),
  ])
);

// Union where oneOf is preferred, but will generate anyOf
const UnionSchema = z4.union([
  z4.object({ format: z4.literal('csv'), delimiter: z4.string() }),
  z4.object({ format: z4.literal('json') }),
]);

// Complex allOf-like structure
const AllOfLike = z4.intersection(
  z4.object({ name: z4.string() }),
  z4.object({ age: z4.number() })
);

// Final response schema
const ComplexRouteResponse = z4.object({
  tree: RecursiveNode,
  format: UnionSchema,
  data: z4.array(SchemaWithIntersectionUnion),
  user: AllOfLike,
});

export const testOasGenerationZ4 = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/test_os_generation_z4',
  options: {
    tags: [],
    access: 'public',
  },
  security: {
    authz: {
      enabled: false,
      reason: 'This route is for testing OpenAPI generation with z4',
    },
  },
  params: z4.object({
    query: z4.object({
      start: z4.string().optional().describe('Start index'),
      child: z4.union([z4.string(), z4.number()]).optional(),
    }),
  }),
  responses: {
    200: {
      description: 'Success response',
      body: ComplexRouteResponse,
      bodyContentType: 'application/json',
    },
    204: {
      description: 'No content',
      body: z4.object({
        changed: z4.literal(false),
      }),
      bodyContentType: 'application/json',
    },
  },
  async handler(resources) {
    const start = resources.params.query?.start;

    if (start && isNaN(parseInt(start, 10))) {
      throw Boom.badRequest('Invalid start index');
    }

    if (start) {
      return {
        changed: true as const,
        data: [{ id: 1 }, { id: 2 }],
      };
    } else {
      return { changed: false as const };
    }
  },
});
