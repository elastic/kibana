/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import type { PluginInitializerContext } from '@kbn/core/server';
import type { ProfilingDataAccessPluginSetup, ProfilingDataAccessPluginStart } from './plugin';

const configSchema = schema.object({
  elasticsearch: schema.conditional(
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
  ),
});

export type ProfilingConfig = TypeOf<typeof configSchema>;

export type { ProfilingDataAccessPluginSetup, ProfilingDataAccessPluginStart };

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ProfilingDataAccessPlugin } = await import('./plugin');
  return new ProfilingDataAccessPlugin(initializerContext);
}
