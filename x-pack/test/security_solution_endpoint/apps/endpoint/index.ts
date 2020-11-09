/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRegistryUrl as getRegistryUrlFromIngest } from '../../../../plugins/fleet/server';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  isRegistryEnabled,
  getRegistryUrlFromTestEnv,
} from '../../../security_solution_endpoint_api_int/registry';

export default function (providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('endpoint', function () {
    this.tags('ciGroup7');
    const ingestManager = getService('ingestManager');
    const log = getService('log');

    if (!isRegistryEnabled()) {
      log.warning('These tests are being run with an external package registry');
    }

    const registryUrl = getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
    log.info(`Package registry URL for tests: ${registryUrl}`);

    before(async () => {
      await ingestManager.setup();
    });
    loadTestFile(require.resolve('./endpoint_list'));
    loadTestFile(require.resolve('./policy_details'));
    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./endpoint_telemetry'));
    loadTestFile(require.resolve('./trusted_apps_list'));
  });
}
