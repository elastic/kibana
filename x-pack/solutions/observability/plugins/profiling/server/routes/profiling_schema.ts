/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { ProfilingSchema } from '@kbn/profiling-utils';

// `schema` query param shared by the topN/functions/flamechart routes.
export const schemaQueryParam = schema.oneOf([schema.literal('ecs'), schema.literal('otel')], {
  defaultValue: 'ecs',
});

// Serverless only has OTel data streams, so the requested schema is ignored there.
export function resolveSchema(
  requested: ProfilingSchema,
  esCapabilities: ElasticsearchCapabilities
): ProfilingSchema {
  return esCapabilities.serverless ? 'otel' : requested;
}
