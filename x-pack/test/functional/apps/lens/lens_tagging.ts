/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects([
    'common',
    'tagManagement',
    'header',
    'dashboard',
    'visualize',
    'lens',
    'timePicker',
  ]);

  const lensTag = 'extreme-lens-tag';
  const lensTitle = 'lens tag test';

  describe('lens tagging', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    it('adds a new tag to a Lens visualization', async () => {
      // create lens
      await dashboardAddPanel.clickCreateNewLink();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('lnsApp_saveButton');

      await PageObjects.visualize.setSaveModalValues(lensTitle, {
        saveAsNew: false,
        redirectToOrigin: true,
      });
      await testSubjects.click('savedObjectTagSelector');
      await testSubjects.click(`tagSelectorOption-action__create`);

      expect(await PageObjects.tagManagement.tagModal.isOpened()).to.be(true);

      await PageObjects.tagManagement.tagModal.fillForm(
        {
          name: lensTag,
          color: '#FFCC33',
          description: '',
        },
        {
          submit: true,
        }
      );

      expect(await PageObjects.tagManagement.tagModal.isOpened()).to.be(false);
      await testSubjects.click('confirmSaveSavedObjectButton');
      await retry.waitForWithTimeout('Save modal to disappear', 1000, () =>
        testSubjects
          .missingOrFail('confirmSaveSavedObjectButton')
          .then(() => true)
          .catch(() => false)
      );
    });

    it('retains its saved object tags after save and return', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.saveAndReturn();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.waitUntilTableIsLoaded();

      // open the filter dropdown
      const filterButton = await find.byCssSelector('.euiFilterGroup .euiFilterButton');
      await filterButton.click();
      await testSubjects.click(
        `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(lensTag)}`
      );
      // click elsewhere to close the filter dropdown
      const searchFilter = await find.byCssSelector('.euiPageBody .euiFieldSearch');
      await searchFilter.click();
      // wait until the table refreshes
      await listingTable.waitUntilTableIsLoaded();
      const itemNames = await listingTable.getAllItemsNames();
      expect(itemNames).to.contain(lensTitle);
    });
  });
}
