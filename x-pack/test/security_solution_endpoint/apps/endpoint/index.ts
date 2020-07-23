/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  skipIfNoRegistry,
  isRegistryEnabled,
} from '../../../security_solution_endpoint_api_int/registryry';

export default function (providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('endpoint', function () {
    this.tags('ciGroup7');
    const ingestManager = getService('ingestManager');
    const log = getService('log');

    skipIfNoRegistry(log);
    before(async () => {
      if (isRegistryEnabled()) {
        await ingestManager.setup();
      } else {
        log.warning('skipping ingest setup because the registry location was not defined');
      }
    });
    loadTestFile(require.resolve('./endpoint_list'));
    loadTestFile(require.resolve('./policy_list'));
    loadTestFile(require.resolve('./policy_details'));
  });
}
