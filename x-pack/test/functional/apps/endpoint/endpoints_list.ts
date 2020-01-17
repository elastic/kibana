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
  const expectedPagination = 5;
  const expectedListings = 16;

  describe('Endpoints List Page', function() {
    this.tags(['skipCloud']);
    before(async () => {
      esArchiver.load('endpoint/pagination');
      await pageObjects.common.navigateToApp('endpoint');
      await pageObjects.endpoint.navToEndpointList();
    });

    after(async () => {
      // await esArchiver.unload('endpoint/pagination');
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

    it('Shows the right number of pages for n number of documents', async () => {
      // change row view
      await pageObjects.endpoint.changeRowView();
      // select 5 rows
      await pageObjects.endpoint.selectFiveRows();
      // check that we are on page 1
      const validateFirstPageClass = await pageObjects.endpoint.checkFirstPageIsActive();
      expect(validateFirstPageClass).to.be(true);
      // get all of the page numbers
      const paginationArr = await pageObjects.endpoint.getPagination();
      // validate that we have the right number of pages
      expect(paginationArr[1]).to.be('Page 1 of 4');
      // validate before page 1 there is a previous
      expect(paginationArr[0]).to.be('Previous page');
      // validate there is a page after page 1
      expect(paginationArr[2]).to.be('Page 2 of 4');
    });
  });
};
