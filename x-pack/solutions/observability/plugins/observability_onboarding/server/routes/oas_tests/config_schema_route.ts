/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

// RecursiveNode workaround: use schema.any() and validate manually if needed
const RecursiveNodeSchema = schema.object({
  id: schema.string(),
  children: schema.maybe(schema.arrayOf(schema.any())), // Accept any, validate recursively in handler if needed
});

// Intersection + Union: use schema.oneOf with shared property
const SchemaWithIntersectionUnion = schema.oneOf([
  schema.object({
    common: schema.string(),
    type: schema.literal('A'),
    valueA: schema.number(),
  }),
  schema.object({
    common: schema.string(),
    type: schema.literal('B'),
    valueB: schema.boolean(),
  }),
]);

// Union for format
const UnionSchema = schema.oneOf([
  schema.object({
    format: schema.literal('csv'),
    delimiter: schema.string(),
  }),
  schema.object({
    format: schema.literal('json'),
  }),
]);

// AllOfLike: merge properties in one object
const AllOfLike = schema.object({
  name: schema.string(),
  age: schema.number(),
});

// StrictObject: use unknowns: 'forbid'
const StrictObject = schema.object(
  {
    name: schema.string(),
    age: schema.number(),
  },
  { unknowns: 'forbid' }
);

// Final response schema
const ComplexRouteResponse = schema.object({
  tree: RecursiveNodeSchema,
  format: UnionSchema,
  data: schema.arrayOf(SchemaWithIntersectionUnion),
  user: AllOfLike,
  profile: StrictObject,
});

export const testOasGenerationKbnConfigSchema = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/test_os_generation_config_schema',
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
  params: schema.object({
    query: schema.object({
      start: schema.maybe(schema.string({ minLength: 1 })),
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
      body: schema.object({
        changed: schema.literal(false),
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
