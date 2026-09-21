/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { ProfilingSchema } from '@kbn/profiling-utils';

export const schemaQueryParam = schema.oneOf([schema.literal('ecs'), schema.literal('otel')], {
  defaultValue: 'ecs',
});

// Serverless only supports the OTel schema (no ECS resources are ever created there),
// so the requested schema is ignored.
export function resolveSchema(
  requested: ProfilingSchema,
  esCapabilities: ElasticsearchCapabilities
): ProfilingSchema {
  return esCapabilities.serverless ? 'otel' : requested;
}
