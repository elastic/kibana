/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'spaceSelector', 'home', 'header', 'security']);
  const a11y = getService('a11y');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

  describe('Kibana spaces page meets a11y validations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await PageObjects.common.navigateToApp('home');
    });

    it('a11y test for manage spaces menu from top nav on Kibana home', async () => {
      await testSubjects.click('space-avatar-default');
      await retry.waitFor(
        'Manage spaces option visible',
        async () => await testSubjects.exists('manageSpaces')
      );
      await a11y.testAppSnapshot();
    });

    it('a11y test for manage spaces page', async () => {
      await PageObjects.spaceSelector.clickManageSpaces();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await toasts.dismissAllToasts();
      await retry.waitFor(
        'Manage spaces page visible',
        async () => await testSubjects.exists('createSpace')
      );
      await a11y.testAppSnapshot();
    });

    it('a11y test for click on create space page', async () => {
      await PageObjects.spaceSelector.clickCreateSpace();
      await PageObjects.spaceSelector.clickEnterSpaceName();
      await PageObjects.spaceSelector.addSpaceName('space_a');
      await a11y.testAppSnapshot();
    });

    // EUI issue - https://github.com/elastic/eui/issues/3999
    it('a11y test for color picker', async () => {
      await PageObjects.spaceSelector.clickColorPicker();
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('a11y test for toggling an entire feature category', async () => {
      await PageObjects.spaceSelector.toggleFeatureCategoryVisibility('kibana');
      await a11y.testAppSnapshot();

      await PageObjects.spaceSelector.openFeatureCategory('kibana');
      await a11y.testAppSnapshot();

      await PageObjects.spaceSelector.toggleFeatureCategoryVisibility('kibana');
    });

    it('a11y test for space listing page', async () => {
      await PageObjects.spaceSelector.clickSaveSpaceCreation();
      await a11y.testAppSnapshot();
    });

    it('a11y test for updating a space', async () => {
      await PageObjects.spaceSelector.clickSpaceEditButton('space_a');
      await a11y.testAppSnapshot();
      await PageObjects.spaceSelector.clickCancelSpaceCreation();
    });

    // creating space b and making it the current space so space selector page gets displayed when space b gets deleted
    it('a11y test for delete space button', async () => {
      await PageObjects.spaceSelector.clickCreateSpace();
      await PageObjects.spaceSelector.clickEnterSpaceName();
      await PageObjects.spaceSelector.addSpaceName('space_b');
      await PageObjects.spaceSelector.clickSaveSpaceCreation();
      await PageObjects.common.navigateToApp('home');
      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('space_b');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickManageSpaces();
      await PageObjects.spaceSelector.clickOnDeleteSpaceButton('space_b');
      await a11y.testAppSnapshot();
    });

    // test starts with deleting space b so we can get the space selection page instead of logging out in the test
    // FLAKY: https://github.com/elastic/kibana/issues/100968
    it.skip('a11y test for space selection page', async () => {
      await PageObjects.spaceSelector.confirmDeletingSpace();
      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
      await PageObjects.spaceSelector.clickSpaceCard('default');
    });
  });
}
