/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This schema now lives in @kbn/security-solution-endpoint-common so that platform-group
// modules — Agent Builder and Workflows — can import it; a platform module cannot depend on
// this plugin, which is group: "security", visibility: "private".
//
// The OpenAPI spec (isolate.schema.yaml) and the zod schema generated from it (isolate.gen.ts) stay
// here: the spec is the source of truth for the public API documentation.
//
// Exports are named rather than `export *`, so the surface this module exposes stays explicit.

export {
  IsolateRouteRequestSchema,
  type IsolationRouteRequestBody,
} from '@kbn/security-solution-endpoint-common';
