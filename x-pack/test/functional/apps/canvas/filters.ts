/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasFiltersTest({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['canvas', 'common']);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const archive = 'x-pack/test/functional/fixtures/kbn_archiver/canvas/filter';

  describe('filters', function () {
    // there is an issue with FF not properly clicking on workpad elements
    this.tags('skipFirefox');

    before(async () => {
      await kibanaServer.importExport.load(archive);
      // load test workpad
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-b5618217-56d2-47fa-b756-1be2306cda68/page/1',
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(archive);
    });
    it('filter updates when dropdown is changed', async () => {
      // wait for all our elements to load up
      await retry.try(async () => {
        const elements = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elements).to.have.length(3);
      });

      // Double check that the filter has the correct time range and default filter value
      const startingMatchFilters = await PageObjects.canvas.getMatchFiltersFromDebug();
      const projectQuery = startingMatchFilters[0].query.term.project;
      expect(projectQuery !== null && typeof projectQuery === 'object').to.equal(true);
      expect(projectQuery?.value).to.equal('apm');

      // Change dropdown value
      await testSubjects.selectValue('canvasDropdownFilter__select', 'beats');

      await retry.try(async () => {
        const matchFilters = await PageObjects.canvas.getMatchFiltersFromDebug();
        const newProjectQuery = matchFilters[0].query.term.project;
        expect(newProjectQuery !== null && typeof newProjectQuery === 'object').to.equal(true);
        expect(newProjectQuery?.value).to.equal('beats');
      });
    });

    it('filter updates when time range is changed', async () => {
      // wait for all our elements to load up
      await retry.try(async () => {
        const elements = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elements).to.have.length(3);
      });

      const startingTimeFilters = await PageObjects.canvas.getTimeFiltersFromDebug();
      const timestampQuery = startingTimeFilters[0].query.range['@timestamp'];
      expect(timestampQuery !== null && typeof timestampQuery === 'object').to.equal(true);
      expect(new Date(timestampQuery.gte).toDateString()).to.equal('Sun Oct 18 2020');
      expect(new Date(timestampQuery.lte).toDateString()).to.equal('Sat Oct 24 2020');

      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await find.clickByCssSelector('.react-datepicker [aria-label="day-19"]', 20000);

      await retry.try(async () => {
        const timeFilters = await PageObjects.canvas.getTimeFiltersFromDebug();
        const newTimestampQuery = timeFilters[0].query.range['@timestamp'];
        expect(newTimestampQuery !== null && typeof newTimestampQuery === 'object').to.equal(true);
        expect(new Date(newTimestampQuery.gte).toDateString()).to.equal('Mon Oct 19 2020');
        expect(new Date(newTimestampQuery.lte).toDateString()).to.equal('Sat Oct 24 2020');
      });

      await testSubjects.click('superDatePickerendDatePopoverButton');
      await find.clickByCssSelector('.react-datepicker [aria-label="day-23"]', 20000);

      await retry.try(async () => {
        const timeFilters = await PageObjects.canvas.getTimeFiltersFromDebug();
        const newTimestampQuery = timeFilters[0].query.range['@timestamp'];
        expect(newTimestampQuery !== null && typeof newTimestampQuery === 'object').to.equal(true);
        expect(new Date(newTimestampQuery.gte).toDateString()).to.equal('Mon Oct 19 2020');
        expect(new Date(newTimestampQuery.lte).toDateString()).to.equal('Fri Oct 23 2020');
      });
    });
  });
}
