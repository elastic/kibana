/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);

  describe('Endpoint Search Bar', function() {
    this.tags(['skipCloud']);
    before(async () => {
      await pageObjects.common.navigateToApp('endpoint');
      await pageObjects.endpoint.navToEndpointList();
    });

    it('Filters Correctly Based on Query String', async () => {
      const queryHost = '_source.host.os.full="Windows Server 2016"';
      await pageObjects.endpoint.searchForObject(queryHost);
      const objects = await pageObjects.endpoint.getSavedObjectsInTable();
      expect(
        objects.every(currentValue => {
          return currentValue === 'Windows Server 2016';
        })
      ).to.be(true);
    });
  });
};
