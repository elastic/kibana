/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'maps']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');

  describe('tooltip filter actions', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('dash for tooltip filter action test');

      await PageObjects.maps.lockTooltipAtPosition(200, -200);
    });

    it('should display create filter button when tooltip is locked', async () => {
      const exists = await testSubjects.exists('mapTooltipCreateFilterButton');
      expect(exists).to.be(true);
    });

    it('should create filters when create filter button is clicked', async () => {
      await testSubjects.click('mapTooltipCreateFilterButton');
      await testSubjects.click('applyFiltersPopoverButton');

      // TODO: Fix me #64861
      // const hasSourceFilter = await filterBar.hasFilter('name', 'charlie');
      // expect(hasSourceFilter).to.be(true);

      const hasJoinFilter = await filterBar.hasFilter('shape_name', 'charlie');
      expect(hasJoinFilter).to.be(true);
    });
  });
}
