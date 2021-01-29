/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// a11y tests for spaces, space selection and spacce creation and feature controls

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
      await esArchiver.load('empty_kibana');
      await PageObjects.common.navigateToApp('home');
    });

    it('a11y test for manage spaces menu from top nav on Kibana home', async () => {
      await PageObjects.spaceSelector.openSpacesNav();
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
      await a11y.testAppSnapshot();
    });

    it('a11y test for for customize space card', async () => {
      await PageObjects.spaceSelector.clickEnterSpaceName();
      await PageObjects.spaceSelector.addSpaceName('space_a');
      await PageObjects.spaceSelector.clickCustomizeSpaceAvatar('space_a');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    // EUI issue - https://github.com/elastic/eui/issues/3999
    it.skip('a11y test for color picker', async () => {
      await PageObjects.spaceSelector.clickColorPicker();
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('a11y test for customize and reset space URL identifier', async () => {
      await PageObjects.spaceSelector.clickOnCustomizeURL();
      await a11y.testAppSnapshot();
      await PageObjects.spaceSelector.clickOnCustomizeURL();
      await a11y.testAppSnapshot();
    });

    it('a11y test for describe space text space', async () => {
      await PageObjects.spaceSelector.clickOnDescriptionOfSpace();
      await a11y.testAppSnapshot();
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
      // a11y test for no space name in confirm dialogue box
      await PageObjects.spaceSelector.confirmDeletingSpace();
      await a11y.testAppSnapshot();
    });

    // test starts with deleting space b so we can get the space selection page instead of logging out in the test
    it('a11y test for space selection page', async () => {
      await PageObjects.spaceSelector.setSpaceNameTobeDeleted('space_b');
      await PageObjects.spaceSelector.confirmDeletingSpace();
      await a11y.testAppSnapshot();
      await PageObjects.spaceSelector.clickSpaceCard('default');
    });
  });
}
