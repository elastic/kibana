/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * The data access plugin does not register config options. It's the profiling plugin that owns the `xpack.profiling` config path.
 * This fragment is shared so the profiling data access and the profiling plugins cannot describe `elasticsearch` differently.
 *
 * Setting it reads profiling data from a remote cluster instead of the one Kibana is connected
 * to: every profiling ES client is redirected, and applying setup is rejected while it is set,
 * since the remote cluster access is meant to be read-only. Dev-only, forbidden in distributions.
 */
export const profilingElasticsearchConfigSchema = schema.conditional(
  schema.contextRef('dist'),
  schema.literal(true),
  schema.never(),
  schema.maybe(
    schema.object({
      hosts: schema.string(),
      username: schema.string(),
      password: schema.string(),
    })
  )
);

export type ProfilingElasticsearchConfig = TypeOf<typeof profilingElasticsearchConfigSchema>;
