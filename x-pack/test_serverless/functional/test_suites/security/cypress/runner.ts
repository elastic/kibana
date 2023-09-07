/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export type { FtrProviderContext } from '../../../ftr_provider_context';

export async function SecuritySolutionCypressTestRunner(
  { getService }: FtrProviderContext,
  envVars?: Record<string, string>
) {
  const config = getService('config');

  return {
    FORCE_COLOR: '1',
    ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
    ...envVars,
  };
}
