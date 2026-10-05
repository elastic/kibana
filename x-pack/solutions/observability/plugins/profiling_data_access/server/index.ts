/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { PluginInitializerContext } from '@kbn/core/server';
import { profilingElasticsearchConfigSchema } from './config';
import type { ProfilingDataAccessPluginSetup, ProfilingDataAccessPluginStart } from './plugin';

const configSchema = schema.object({
  elasticsearch: profilingElasticsearchConfigSchema,
});

export type ProfilingConfig = TypeOf<typeof configSchema>;

export { profilingElasticsearchConfigSchema };
export type { ProfilingElasticsearchConfig } from './config';
export type { ProfilingDataAccessPluginSetup, ProfilingDataAccessPluginStart };
export type {
  CreateProfilingEsClient,
  CreateProfilingEsClientParams,
  ProfilingESClient,
} from './utils/profiling_es_client';
export { isServerless } from './utils/is_serverless';

export { getApmPolicy, ELASTIC_CLOUD_APM_POLICY } from './universal_profiling/lib/get_apm_policy';
export { MAX_BUCKETS } from './universal_profiling/lib/cluster_settings';
export {
  getCollectorPolicy,
  getSymbolizerPolicy,
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from './universal_profiling/lib/fleet_policies';
export type { ProfilingSetupOptions, SetupState } from './universal_profiling/lib/setup';
export type {
  CloudSetupState,
  ProfilingCloudSetupOptions,
} from './universal_profiling/lib/cloud_setup';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ProfilingDataAccessPlugin } = await import('./plugin');
  return new ProfilingDataAccessPlugin(initializerContext);
}
