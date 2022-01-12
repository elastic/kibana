/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context } from 'mocha';
import { ToolingLog } from '@kbn/dev-utils';
import { FtrProviderContext } from './ftr_provider_context';

export function skipIfNoDockerRegistry(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const dockerServers = getService('dockerServers');

  const server = dockerServers.get('registry');
  const log = getService('log');

  beforeEach(function beforeSetupWithDockerRegistry() {
    if (!server.enabled) {
      warnAndSkipTest(this, log);
    }
  });
}
