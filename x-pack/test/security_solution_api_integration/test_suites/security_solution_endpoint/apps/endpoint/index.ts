/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/scripts/endpoint/common/stack_services';
import { FtrProviderContext } from '../../configs/ftr_provider_context';
import {
  getRegistryUrlFromTestEnv,
  isRegistryEnabled,
} from '../../../security_solution_endpoint_api_int/registry';

export default function (providerContext: FtrProviderContext) {
  const { loadTestFile, getService, getPageObjects } = providerContext;

  // Flaky: https://github.com/elastic/kibana/issues/186089
  describe('@skipInServerless endpoint', function () {
    const ingestManager = getService('ingestManager');
    const log = getService('log');
    const endpointTestResources = getService('endpointTestResources');
    const kbnClient = getService('kibanaServer');

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

      if (await isServerlessKibanaFlavor(kbnClient)) {
        log.info('login for serverless environment');
        const pageObjects = getPageObjects(['svlCommonPage']);
        await pageObjects.svlCommonPage.login();
      }
    });
    loadTestFile(require.resolve('./endpoint_list'));
    loadTestFile(require.resolve('./endpoint_telemetry'));
    loadTestFile(require.resolve('./endpoint_permissions'));
    loadTestFile(require.resolve('./endpoint_solution_integrations'));
  });
}
