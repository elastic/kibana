/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects([
    'common',
    'endpoint',
    'header',
    'endpointPageUtils',
    'responder',
  ]);
  const testSubjects = getService('testSubjects');
  const endpointTestResources = getService('endpointTestResources');
  const log = getService('log');

  const performResponderSanityChecks = async () => {
    // Show the Action log
    await pageObjects.responder.openActionLogFlyout();

    // Ensure the popover in the action log date quick select picker is accessible
    // (this is especially important for when Responder is displayed from a Timeline
    await (await testSubjects.find('superDatePickerToggleQuickMenuButton')).click();
    await (await testSubjects.find('superDatePickerCommonlyUsed_Last_1 year')).click();
    await pageObjects.responder.closeActionLogFlyout();

    // Close responder
    await pageObjects.responder.closeResponder();
  };

  describe.skip('Response Actions Responder', function () {
    let indexedData: IndexedHostsAndAlertsResponse;

    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData({
        numHosts: 2,
        generatorSeed: 'responder',
      });
    });

    after(async () => {
      if (indexedData) {
        log.info('Cleaning up loaded data');
        await endpointTestResources.unloadEndpointData(indexedData);
      }
    });

    describe('from the Endpoint list and details', () => {
      before(async () => {
        await pageObjects.endpoint.navigateToEndpointList();
      });

      it('should show Responder from the endpoint list', async () => {
        await pageObjects.endpoint.showResponderFromEndpointList(indexedData.hosts[0].agent.id);
        await performResponderSanityChecks();
      });

      it('should show Responder from the endpoint details', async () => {
        await pageObjects.endpoint.showResponderFromEndpointDetails(indexedData.hosts[0].agent.id);
        await performResponderSanityChecks();
      });
    });
  });
};
