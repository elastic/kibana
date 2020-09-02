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

  describe('Kibana spaces page meets a11y validations', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      await PageObjects.common.navigateToApp('home');
    });

    it('navigate to manage spaces home page', async () => {
      await PageObjects.spaceSelector.openSpacesNav();
      await retry.waitFor(
        'Manage spaces option visible',
        async () => await testSubjects.exists('manageSpaces')
      );
      await PageObjects.spaceSelector.clickManageSpaces();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await a11y.testAppSnapshot();
    });

    it('click on create space button', async () => {
      await PageObjects.spaceSelector.clickCreateSpace();
      await a11y.testAppSnapshot();
    });

    it('click on input space name', async () => {
      await PageObjects.spaceSelector.clickEnterSpaceName();
      await a11y.testAppSnapshot();
    });

    it('add in space name as space a', async () => {
      await PageObjects.spaceSelector.addSpaceName('space_a');
      await a11y.testAppSnapshot();
    });

    it('click on space avatar to open customize space avatar', async () => {
      await PageObjects.spaceSelector.clickSpaceAcustomAvatar();
      await a11y.testAppSnapshot();
    });

    it('click on space initials input in ', async () => {
      await PageObjects.spaceSelector.clickSpaceInitials();
      await a11y.testAppSnapshot();
    });

    it('add in space initials as sa', async () => {
      await PageObjects.spaceSelector.addSpaceInitials('sa');
      await a11y.testAppSnapshot();
    });

    // EUI issue - https://github.com/elastic/eui/issues/3999
    it.skip('click on the color picker', async () => {
      await PageObjects.spaceSelector.clickColorPicker();
      await a11y.testAppSnapshot();
    });

    // remove the first line once EUI color picker is fixed
    it('click on a color in color picker in customize space', async () => {
      await PageObjects.spaceSelector.clickColorPicker();
      await PageObjects.spaceSelector.setColorinPicker('#2E5C57');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    // close custom dialog - adding file upload test here
    it('click escape to close the custom avatar dialog box', async () => {
      await browser.pressKeys(browser.keys.ESCAPE);
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('click customize URL identifier', async () => {
      await PageObjects.spaceSelector.clickOnCustomizeURL();
      await a11y.testAppSnapshot();
    });

    it('click on space URL display box', async () => {
      await PageObjects.spaceSelector.clickOnSpaceURLDisplay();
      await a11y.testAppSnapshot();
    });

    it('set the space URL value', async () => {
      await PageObjects.spaceSelector.setSpaceURL('yay');
      await a11y.testAppSnapshot();
    });

    it('click on reset URL value', async () => {
      await PageObjects.spaceSelector.clickOnCustomizeURL();
      await a11y.testAppSnapshot();
    });

    it('click on describe the space block', async () => {
      await PageObjects.spaceSelector.clickOnDescriptionOfSpace();
      await a11y.testAppSnapshot();
    });

    it('set the description of the space', async () => {
      const spaceDescription = 'This is a rocking a11y space';
      await PageObjects.spaceSelector.setOnDescriptionOfSpace(spaceDescription);
      await a11y.testAppSnapshot();
    });

    it('click on "show" button to open customize feature display', async () => {
      await PageObjects.spaceSelector.clickShowFeatures();
      await a11y.testAppSnapshot();
    });

    it('click on change all next to show? table header to change all feature visibility', async () => {
      await PageObjects.spaceSelector.clickFeaturesVisibilityButton();
      await a11y.testAppSnapshot();
    });

    it('click on hide all features option', async () => {
      await PageObjects.spaceSelector.clickHideAllFeatures();
      await a11y.testAppSnapshot();
    });

    it('click on show all features option', async () => {
      await PageObjects.spaceSelector.clickFeaturesVisibilityButton();
      await PageObjects.spaceSelector.clickShowAllFeatures();
      await a11y.testAppSnapshot();
    });

    it('hide enterprisesearch feature as one of the examples to toggle the visibibility of a feature', async () => {
      await PageObjects.spaceSelector.toggleFeatureVisibility('enterpriseSearch');
      await a11y.testAppSnapshot();
    });

    it('Click on save space', async () => {
      await PageObjects.spaceSelector.clickSaveSpaceCreation();
      await a11y.testAppSnapshot();
    });

    it('click on edit space a', async () => {
      await PageObjects.spaceSelector.clickSpaceEditButton('space_a');
      await a11y.testAppSnapshot();
    });

    it('update description on space a and click update', async () => {
      const spaceDescription = 'A11y rocks this space';
      await PageObjects.spaceSelector.setOnDescriptionOfSpace(spaceDescription);
      await PageObjects.spaceSelector.clickSaveSpaceCreation();
      await a11y.testAppSnapshot();
    });

    it('Click cancel after choosing to click edit on space a', async () => {
      await PageObjects.spaceSelector.clickSpaceEditButton('space_a');
      await PageObjects.spaceSelector.clickCancelSpaceCreation();
      await a11y.testAppSnapshot();
    });

    it('click on roles page from manage spaces page', async () => {
      await PageObjects.spaceSelector.clickGoToRolesPage();
      await a11y.testAppSnapshot();
    });

    it('navigate back to spaces management page', async () => {
      await PageObjects.spaceSelector.openSpacesNav();
      await retry.waitFor(
        'Manage spaces option visible',
        async () => await testSubjects.exists('manageSpaces')
      );
      await PageObjects.spaceSelector.clickManageSpaces();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await a11y.testAppSnapshot();
    });

    it('create space b so that we can delete it', async () => {
      await PageObjects.spaceSelector.clickCreateSpace();
      await PageObjects.spaceSelector.clickEnterSpaceName();
      await PageObjects.spaceSelector.addSpaceName('space_b');
      await PageObjects.spaceSelector.clickSaveSpaceCreation();
      await a11y.testAppSnapshot();
    });

    it('Click on space b to navigate space b', async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.clickSpaceAvatar('space_b');
      await a11y.testAppSnapshot();
    });

    it('Click on manage spaces from space b in top menu to navigate to manage spaces page in space b', async () => {
      await PageObjects.spaceSelector.openSpacesNav();
      await retry.waitFor(
        'Manage spaces option visible',
        async () => await testSubjects.exists('manageSpaces')
      );
      await PageObjects.spaceSelector.clickManageSpaces();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await a11y.testAppSnapshot();
    });

    it('Click on delete space b', async () => {
      await PageObjects.spaceSelector.clickOnDeleteSpaceButton('space_b');
      await a11y.testAppSnapshot();
    });

    it('click on cancel so cancel button gets tested', async () => {
      await PageObjects.spaceSelector.cancelDeletingSpace();
      await a11y.testAppSnapshot();
    });

    it('Click delete again on space b and set the space name to space_b in confirm space name input box', async () => {
      await PageObjects.spaceSelector.clickOnDeleteSpaceButton('space_b');
      await PageObjects.spaceSelector.setSpaceNameTobeDeleted('space_b');
      await a11y.testAppSnapshot();
    });

    it('Click confirm delete and Kibana takes the user to space selection page because we are deleting the current space', async () => {
      await PageObjects.spaceSelector.confirmDeletingSpace();
      await a11y.testAppSnapshot();
    });

    it('Select space a from space selector page', async () => {
      await PageObjects.spaceSelector.clickSpaceCard('space_a');
      await a11y.testAppSnapshot();
    });
  });
}
