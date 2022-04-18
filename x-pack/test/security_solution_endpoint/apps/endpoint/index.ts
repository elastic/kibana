/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
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
    const endpointTestResources = getService('endpointTestResources');

    if (!isRegistryEnabled()) {
      log.warning('These tests are being run with an external package registry');
    }

    const registryUrl = getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
    log.info(`Package registry URL for tests: ${registryUrl}`);

    before(async () => {
      log.info('calling Fleet setup');
      await ingestManager.setup();

      log.info('installing/upgrading Endpoint fleet package');
      await endpointTestResources.installOrUpgradeEndpointFleetPackage();
    });
    loadTestFile(require.resolve('./endpoint_list'));
    loadTestFile(require.resolve('./policy_list'));
    loadTestFile(require.resolve('./policy_details'));
    loadTestFile(require.resolve('./endpoint_telemetry'));
    loadTestFile(require.resolve('./trusted_apps_list'));
    loadTestFile(require.resolve('./fleet_integrations'));
    loadTestFile(require.resolve('./endpoint_permissions'));
  });
}
