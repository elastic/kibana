/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as z from '@kbn/zod';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

// Recursive schema using z.lazy (needs ref strategy to resolve)
const RecursiveNode: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      children: z.array(RecursiveNode).optional(),
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
const SchemaWithIntersectionUnion = z.intersection(
  z.object({ field2: z.boolean() }),
  z.union([z.object({ field1: z.number() }), z.object({ field3: z.string() })])
);

// Union where oneOf is preferred, but will generate anyOf
const UnionSchema = z.union([
  z.object({ format: z.literal('csv'), delimiter: z.string() }),
  z.object({ format: z.literal('json') }),
]);

// Complex allOf-like structure
const AllOfLike = z.intersection(z.object({ name: z.string() }), z.object({ age: z.number() }));

const StrictObject = z
  .object({
    name: z.string(),
    age: z.number(),
  })
  .strict()
  .describe('This is a strict object with no additional properties');

const OneOfDiscriminator = z.discriminatedUnion('MemberOrGuest', [
  z.object({
    type: z.literal('Member'),
    memberId: z.string(),
    department: z.literal('engineering', 'support'),
  }),
  z.object({ type: z.literal('Guest'), guestId: z.string(), guestName: z.string() }),
]);

// Final response schema
const ComplexRouteResponse = z.object({
  tree: RecursiveNode,
  format: UnionSchema,
  data: z.array(SchemaWithIntersectionUnion),
  user: AllOfLike,
  profile: StrictObject,
  memberOrGuest: OneOfDiscriminator,
});

export const testOasGenerationZ3 = createObservabilityOnboardingServerRoute({
  endpoint: 'PUT /api/test_os_generation/{id}',
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
      startDate: z.date().describe('Start date for the query').meta({
        example: 'now-1d',
      }),
      endDate: z.date().describe('End date for the query').default('now').optional().meta({
        example: '2023-10-31T23:59:59Z',
      }),
      ids: z.array(z.number()).describe('List of child IDs to return').optional(),
      nullableStr: z.string().nullable().describe('A nullable string field').optional(),
    }),
    path: z.object({
      id: z.string().describe('The ID of the resource').meta({
        example: '12345',
      }),
    }),
    body: z.object({}).describe('Empty body for PUT request').strict(),
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
    const start = resources.params.query?.startDate;

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
