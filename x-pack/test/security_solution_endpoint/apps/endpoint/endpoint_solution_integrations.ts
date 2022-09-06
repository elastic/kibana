/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../ftr_provider_context';

/**
 * Test suite is mean to cover usages of endpoint functionality or access to endpoint
 * functionality from other areas of security solution.
 */
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const endpointService = getService('endpointTestResources');
  const log = getService('log');
  const pageObjects = getPageObjects(['common', 'timeline']);

  describe('App level Endpoint functionality', () => {
    let indexedData: IndexedHostsAndAlertsResponse;

    before(async () => {
      indexedData = await endpointService.loadEndpointData({
        numHosts: 2,
        generatorSeed: `app-level-endpoint-${Math.random()}`,
      });

      // stop/start the Endpoint Detetions Rule so that alerts get loaded faster
    });

    after(async () => {
      if (indexedData) {
        log.info('Cleaning up loaded endpoint data');
        await endpointService.unloadEndpointData(indexedData);
      }
    });

    describe('Isolation action access', () => {
      describe('from Timeline', () => {
        before(async () => {
          // stop/start endpoint rule
          //
          // wait for alerts
        });
      });
    });
  });
};
