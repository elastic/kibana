/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasFiltersTest({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['canvas', 'common']);
  const find = getService('find');
  const esArchiver = getService('esArchiver');

  describe('filters', function () {
    // there is an issue with FF not properly clicking on workpad elements
    this.tags('skipFirefox');

    before(async () => {
      await esArchiver.load('canvas/filter');
      // load test workpad
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-b5618217-56d2-47fa-b756-1be2306cda68/page/1',
      });
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
      expect(startingMatchFilters[0].value).to.equal('apm');
      expect(startingMatchFilters[0].column).to.equal('project');

      // Change dropdown value
      await testSubjects.selectValue('canvasDropdownFilter__select', 'beats');

      await retry.try(async () => {
        const matchFilters = await PageObjects.canvas.getMatchFiltersFromDebug();
        expect(matchFilters[0].value).to.equal('beats');
        expect(matchFilters[0].column).to.equal('project');
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
      expect(startingTimeFilters[0].column).to.equal('@timestamp');
      expect(new Date(startingTimeFilters[0].from).toDateString()).to.equal('Sun Oct 18 2020');
      expect(new Date(startingTimeFilters[0].to).toDateString()).to.equal('Sat Oct 24 2020');

      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await find.clickByCssSelector('.react-datepicker [aria-label="day-19"]', 20000);

      await retry.try(async () => {
        const timeFilters = await PageObjects.canvas.getTimeFiltersFromDebug();
        expect(timeFilters[0].column).to.equal('@timestamp');
        expect(new Date(timeFilters[0].from).toDateString()).to.equal('Mon Oct 19 2020');
        expect(new Date(timeFilters[0].to).toDateString()).to.equal('Sat Oct 24 2020');
      });

      await testSubjects.click('superDatePickerendDatePopoverButton');
      await find.clickByCssSelector('.react-datepicker [aria-label="day-23"]', 20000);

      await retry.try(async () => {
        const timeFilters = await PageObjects.canvas.getTimeFiltersFromDebug();
        expect(timeFilters[0].column).to.equal('@timestamp');
        expect(new Date(timeFilters[0].from).toDateString()).to.equal('Mon Oct 19 2020');
        expect(new Date(timeFilters[0].to).toDateString()).to.equal('Fri Oct 23 2020');
      });
    });
  });
}
