/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'home', 'spaceSelector']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const find = getService('find');
  const browser = getService('browser');

  describe('Kibana saved objects management page a11y tests', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    after(async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('space_a');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickManageSpaces();
      await PageObjects.spaceSelector.clickOnDeleteSpaceButton('space_a');
      await PageObjects.spaceSelector.confirmDeletingSpace();

      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');

    });

    it('saved objects management page a11y validations', async () => {
      await a11y.testAppSnapshot();
    });

    it('import objects panel meets a11y validations', async () => {
      await testSubjects.click('importObjects');
      await a11y.testAppSnapshot();
    });

    it('export all objects panel meets a11y requirements', async () => {
      await testSubjects.click('euiFlyoutCloseButton');
      await testSubjects.click('exportAllObjects');
      await a11y.testAppSnapshot();
    });

    it('types drop-down panel meets a11y requirements', async () => {
      await testSubjects.click('cancelAllExports');
      // await testSubjects.click('savedObjectsTableRowType');
      await (await find.byCssSelector('[title="Type"]')).click();
      await a11y.testAppSnapshot();
    });

    it('saved objects table filtered on a type meets a11y requirements', async () => {
      await (await find.byCssSelector('[title="data view"]')).click();
      await a11y.testAppSnapshot();
    });

    it('actions panel on saved object type meets a11y requirements', async () => {
      await testSubjects.click('euiCollapsedItemActionsButton');
      await a11y.testAppSnapshot();
    });

    it('relationships panel item from actions meets a11y requirements', async () => {
      await testSubjects.click('savedObjectsTableAction-relationships');
      await a11y.testAppSnapshot();
    });

    it('share to space panel from actions meets a11y requirements ', async () => {
      await testSubjects.click('euiFlyoutCloseButton');
      await this.find.byCssSelector('.euiContextMenuPanel');
      await testSubjects.click('euiCollapsedItemActionsButton');
      await testSubjects.click('savedObjectsTableAction-share_saved_objects_to_space');
      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
      // creating a new space from this panel
      await testSubjects.click('sts-new-space-link');
      await PageObjects.spaceSelector.clickEnterSpaceName();
      await PageObjects.spaceSelector.addSpaceName('space_a');
      await PageObjects.spaceSelector.clickSaveSpaceCreation();
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await (await find.byCssSelector('[title="Type"]')).click();
      await (await find.byCssSelector('[title="data view"]')).click();
      await browser.pressKeys(browser.keys.ESCAPE);
      await this.find.byCssSelector('.euiContextMenuPanel');
      await retry.waitFor(
        'actions button visible',
        async () => await testSubjects.exists('euiCollapsedItemActionsButton')
      );
      await testSubjects.click('euiCollapsedItemActionsButton');
      await testSubjects.click('savedObjectsTableAction-share_saved_objects_to_space');
      await (await find.byCssSelector('[title="All spaces"]')).click();
      await testSubjects.click('sts-save-button');
      await retry.waitFor('toasts.toBeVisible', async () => (await toasts.getToastCount()) > 0);
      await toasts.dismissAllToasts();
    });

    it('copy to space panel from actions menu meets a11y requirements ', async () => {
      wait this.find.byCssSelector('.euiContextMenuPanel');
      await retry.waitFor(
        'actions button visible',
        async () => await testSubjects.exists('euiCollapsedItemActionsButton')
      );
      await testSubjects.click('euiCollapsedItemActionsButton');
      await PageObjects.common.sleep(1000);
      await this.find.byCssSelector('.euiContextMenuPanel');
      await testSubjects.click('euiCollapsedItemActionsButton');
      await testSubjects.click('savedObjectsTableAction-copy_saved_objects_to_space');
      await a11y.testAppSnapshot();
    });




    // inspecting a different saved object than data views because the inspect screen is different

    it('inspect action from actions menu meets a11y requirements', async () => {
      await testSubjects.click('cts-cancel-button');
      await (await find.byCssSelector('[title="Type"]')).click();
      await (await find.byCssSelector('[title="data view"]')).click();
      await (await find.byCssSelector('[title="config"]')).click();
      await browser.pressKeys(browser.keys.ESCAPE);
      await this.find.byCssSelector('.euiContextMenuPanel');
      await testSubjects.click('euiCollapsedItemActionsButton');
      await testSubjects.click('savedObjectsTableAction-inspect');
      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
    });
  });
}
