/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as z from '@kbn/zod';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

// Recursive schema using z.lazy (needs ref strategy to resolve)
const RecursiveNode: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      children: z.array(RecursiveNode).optional(),
    })
    .openapi({
      description: 'A node in a recursive structure, can have children that are also nodes',
      example: {
        id: 'node1',
        children: [{ id: 'node2', children: [] }, { id: 'node3' }],
      },
    })
);

// Intersection + Union - problematic in OAS
const SchemaWithIntersectionUnion = z.intersection(
  z.object({ common: z.string() }),
  z.union([
    z.object({ type: z.literal('A'), valueA: z.number() }),
    z.object({ type: z.literal('B'), valueB: z.boolean() }),
  ])
);

// Union where oneOf is preferred, but will generate anyOf
const UnionSchema = z.union([
  z.object({ format: z.literal('csv'), delimiter: z.string() }),
  z.object({ format: z.literal('json') }),
]);

// Complex allOf-like structure
const AllOfLike = z.intersection(z.object({ name: z.string() }), z.object({ age: z.number() }));

// Final response schema
const ComplexRouteResponse = z.object({
  tree: RecursiveNode,
  format: UnionSchema,
  data: z.array(SchemaWithIntersectionUnion),
  user: AllOfLike,
});

export const testOasGenerationZ3ZodOpenapi = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/test_os_generation_zod-openapi',
  options: {
    tags: [],
    access: 'public',
  },
  security: {
    authz: {
      enabled: false,
      reason: 'This route is for testing OpenAPI generation',
    },
  },
  params: z.object({
    query: z.object({
      start: z.string().optional().describe('Start index'),
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
      body: z.object({
        changed: z.literal(false),
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
