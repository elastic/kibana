/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('Endpoints List Page', function() {
    this.tags(['skipCloud']);
    before(async () => {
      esArchiver.load('endpoint/endpoints');
      await pageObjects.common.navigateToApp('endpoint');
    });

    after(async () => {
      await esArchiver.unload('endpoint/endpoints');
    });

    it('Navigate to Endpoints list page', async () => {
      // navigate to the endpoints list page
      const container = await testSubjects.find('menuEndpoint');
      const link = await container.findByXpath("//button[. = 'Endpoints']");
      await link.click();
      // find the search bar
      const endpointSearchBar = await testSubjects.find('endpointsSearchBar');
      // add the search criteria
      await endpointSearchBar.type('_source.host.os.full="Windows Server 2016"');
      // press the enter key
      await endpointSearchBar.pressKeys(browser.keys.ENTER);
      // find all the endpoint operating systems
      const endpointList = await testSubjects.findAll('indexTableCellOs');
      for (let i = 0; i < endpointList.length; i++) {
        expect(await endpointList[i].getVisibleText()).to.be('Windows Server 2016');
      }
    });
  });
};
