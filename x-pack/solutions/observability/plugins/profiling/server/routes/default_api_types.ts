/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ProfilingSchema } from '@kbn/profiling-utils';

export const profilingSchemaParam = schema.maybe(
  schema.oneOf([schema.literal(ProfilingSchema.ECS), schema.literal(ProfilingSchema.OTEL)])
);
