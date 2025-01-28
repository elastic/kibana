/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getApmPolicy, ELASTIC_CLOUD_APM_POLICY } from './get_apm_policy';
export { MAX_BUCKETS } from './cluster_settings';
export {
  getCollectorPolicy,
  getSymbolizerPolicy,
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from './fleet_policies';

export type { ProfilingCloudSetupOptions } from './cloud_setup';
