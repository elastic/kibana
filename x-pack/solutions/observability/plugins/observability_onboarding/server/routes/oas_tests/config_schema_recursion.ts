/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
// import * as z from '@kbn/zod'; // No longer needed for validation
import { schema } from '@kbn/config-schema'; // Import the @kbn/config-schema
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

// --- SCHEMA TRANSLATION ---

// Recursive schema using schema.recursive (equivalent to z.lazy)
const RecursiveNodeSchema = schema.recursive((r) =>
  schema.object({
    id: schema.string(),
    children: schema.arrayOf(r).optional(), // Reference 'r' which is the recursive schema itself
  })
);

// Intersection + Union:
// @kbn/config-schema doesn't have a direct `intersection` equivalent.
// For unions, it uses `schema.oneOf` which produces OpenAPI `oneOf`.
// For intersections, you typically represent them by combining properties or using `allOf` in OpenAPI.
// In @kbn/config-schema, if you need to validate that an object has properties from two separate schemas,
// and then *also* satisfies a union, you might structure it as an object where the common properties
// are directly defined, and the varying parts are handled by `oneOf`.
// For `z.intersection(A, B)`, if A and B are objects, `schema.object(A.keys, B.keys)` is the closest.
// Here, we have a common property `common` and then a union.
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

// Union where oneOf is preferred (schema.oneOf)
const UnionSchema = schema.oneOf([
  schema.object({
    format: schema.literal('csv'),
    delimiter: schema.string(),
  }),
  schema.object({
    format: schema.literal('json'),
  }),
]);

// Complex allOf-like structure (schema.object for combining properties)
// Zod's intersection for two objects (A & B) is effectively merging their properties.
// @kbn/config-schema's `schema.object` is used for this.
const AllOfLikeSchema = schema.object({
  name: schema.string(),
  age: schema.number(),
});

// StrictObject: @kbn/config-schema.object has a `allowUnknowns` option, default is `false` (strict)
const StrictObjectSchema = schema.object(
  {
    name: schema.string(),
    age: schema.number(),
  },
  {
    // By default, `schema.object` is strict (i.e., `allowUnknowns: false`).
    // So, explicitly setting it here is often redundant but good for clarity.
    allowUnknowns: false,
    // There isn't a direct equivalent for `describe` or `meta` for documentation
    // at this level in @kbn/config-schema. Documentation is usually separate.
  }
);

// Final response schema
const ComplexRouteResponseSchema = schema.object({
  tree: RecursiveNodeSchema,
  format: UnionSchema,
  // Note: z.array(SchemaWithIntersectionUnion) becomes schema.arrayOf(SchemaWithIntersectionUnion)
  data: schema.arrayOf(SchemaWithIntersectionUnion),
  user: AllOfLikeSchema,
  profile: StrictObjectSchema,
});

// --- ROUTE DEFINITION ---

export const testOasGenerationKbnConfigSchema = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/test_os_generation',
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
  // Use @kbn/config-schema for params and responses validation
  params: schema.object({
    query: schema.object({
      // Use schema.string().maybe() for optional, and schema.literal for descriptions
      start: schema.string().maybe(), // Equivalent to z.string().optional()
      // Descriptions are not directly tied to schema definitions in @kbn/config-schema
      // They are usually handled by documentation systems separately.
    }),
  }),
  responses: {
    200: {
      description: 'Success response',
      body: ComplexRouteResponseSchema, // Use the @kbn/config-schema translated schema
      bodyContentType: 'application/json',
    },
    204: {
      description: 'No content',
      body: schema.object({
        // Direct inline schema
        changed: schema.literal(false), // Equivalent to z.literal(false)
      }),
      bodyContentType: 'application/json',
    },
  },
  async handler(resources) {
    const start = resources.params.query?.start;

    if (start && isNaN(parseInt(start, 10))) {
      throw Boom.badRequest('Invalid start index');
    }

    // The return types now need to match the @kbn/config-schema definition.
    // For `changed: true as const`, the schema expects { changed: schema.literal(true) }.
    // For the data, it expects the `SchemaWithIntersectionUnion` structure.
    // This part of the handler would need to produce data that validates against `ComplexRouteResponseSchema`.

    // Example handler return that *would* validate against ComplexRouteResponseSchema:
    if (start) {
      return {
        tree: { id: 'root', children: [{ id: 'child1' }] },
        format: { format: 'csv', delimiter: ',' },
        data: [{ common: 'xyz', type: 'A', valueA: 123 }],
        user: { name: 'John Doe', age: 30 },
        profile: { name: 'Jane', age: 25 },
      };
    } else {
      // This return matches the 204 response body: { changed: false }
      return { changed: false };
    }
  },
});
