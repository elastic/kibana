/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { parse } from 'url';

export default function canvasSmokeTest({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common']);

  describe('smoke test', async () => {
    const workpadListSelector = 'canvasWorkpadLoaderTable canvasWorkpadLoaderWorkpad';
    const testWorkpadId = 'workpad-a3524db3-4014-403d-9ef6-2d6ffa655285';

    before(async () => {
      // init data
      await Promise.all([
        esArchiver.loadIfNeeded('logstash_functional'),
        esArchiver.load('canvas/default'),
      ]);

      // load canvas
      // see also navigateToUrl(app, hash)
      await PageObjects.common.navigateToApp('canvas');
    });

    it('loads workpad list', async () => {
      const workpadRows = await testSubjects.findAll(workpadListSelector);
      expect(workpadRows).to.have.length(1);
      expect(await workpadRows[0].getVisibleText()).to.equal('Test Workpad');
    });

    it('loads workpage and renders elements', async () => {
      // click the first workpad in the list to load it
      const link = await testSubjects.find(workpadListSelector);
      await link.click();

      // wait for the workpad page to load
      await testSubjects.find('canvasWorkpadPage');

      // check that workpad loaded in url
      const url = await remote.getCurrentUrl();
      expect(parse(url).hash).to.equal(`#/workpad/${testWorkpadId}/page/1`);

      // check for elements on the page
      const elements = await testSubjects.findAll('canvasWorkpadPage canvasWorkpadPageElementContent');
      expect(elements).to.have.length(3);

      // check that the elements are what we expect
      // first element is a datatable that uses essql
      const rows = await elements[0].findAllByCssSelector('.canvasDataTable tbody tr');
      expect(rows).to.have.length(10);

      // second is a markdown element
      const md = await elements[1].findByCssSelector('.canvasMarkdown');
      expect(await md.getVisibleText()).to.contain('Welcome to Canvas');

      // third is a datatable that uses csv
      const rows2 = await elements[2].findAllByCssSelector('.canvasDataTable tbody tr');
      expect(rows2).to.have.length(2);
    });
  });
}
