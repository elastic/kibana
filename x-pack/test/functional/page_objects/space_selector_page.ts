/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SpaceSelectorPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const find = getService('find');
  const PageObjects = getPageObjects(['common']);

  class SpaceSelectorPage {
    async initTests() {
      log.debug('SpaceSelectorPage:initTests');
    }

    async clickSpaceCard(spaceId: string) {
      return await retry.try(async () => {
        log.info(`SpaceSelectorPage:clickSpaceCard(${spaceId})`);
        await testSubjects.click(`space-card-${spaceId}`);
        await PageObjects.common.sleep(1000);
      });
    }

    async expectHomePage(spaceId: string) {
      return await this.expectRoute(spaceId, `/app/home#/`);
    }

    async expectRoute(spaceId: string, route: string) {
      return await retry.try(async () => {
        log.debug(`expectRoute(${spaceId}, ${route})`);
        await find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
        const url = await browser.getCurrentUrl();
        if (spaceId === 'default') {
          expect(url).to.contain(route);
        } else {
          expect(url).to.contain(`/s/${spaceId}${route}`);
        }
      });
    }

    async openSpacesNav() {
      log.debug('openSpacesNav()');
      return await testSubjects.click('spacesNavSelector');
    }

    async clickManageSpaces() {
      await testSubjects.click('manageSpaces');
    }

    async clickCreateSpace() {
      await testSubjects.click('createSpace');
    }

    async clickEnterSpaceName() {
      await testSubjects.click('addSpaceName');
    }

    async addSpaceName(spaceName: string) {
      await testSubjects.setValue('addSpaceName', spaceName);
    }

    async clickCustomizeSpaceAvatar(spaceId: string) {
      await testSubjects.click(`space-avatar-${spaceId}`);
    }

    async clickSpaceInitials() {
      await testSubjects.click('spaceLetterInitial');
    }

    async addSpaceInitials(spaceInitials: string) {
      await testSubjects.setValue('spaceLetterInitial', spaceInitials);
    }

    async clickColorPicker() {
      await testSubjects.click('colorPickerAnchor');
    }

    async setColorinPicker(hexValue: string) {
      await testSubjects.setValue('colorPickerAnchor', hexValue);
    }

    async clickShowFeatures() {
      await testSubjects.click('show-hide-section-link');
    }

    async clickChangeAllPriv() {
      await testSubjects.click('changeAllPrivilegesButton');
    }

    async clickSaveSpaceCreation() {
      await testSubjects.click('save-space-button');
    }

    async clickSpaceEditButton(spaceName: string) {
      await testSubjects.click(`${spaceName}-editSpace`);
    }

    async clickGoToRolesPage() {
      await testSubjects.click('rolesManagementPage');
    }

    async clickCancelSpaceCreation() {
      await testSubjects.click('cancel-space-button');
    }

    async clickOnCustomizeURL() {
      await testSubjects.click('CustomizeOrReset');
    }

    async clickOnSpaceURLDisplay() {
      await testSubjects.click('spaceURLDisplay');
    }

    async setSpaceURL(spaceURL: string) {
      await testSubjects.setValue('spaceURLDisplay', spaceURL);
    }

    async clickHideAllFeatures() {
      await testSubjects.click('spc-toggle-all-features-hide');
    }

    async clickShowAllFeatures() {
      await testSubjects.click('spc-toggle-all-features-show');
    }

    async openFeatureCategory(categoryName: string) {
      const category = await find.byCssSelector(
        `button[aria-controls=featureCategory_${categoryName}]`
      );
      const isCategoryExpanded = (await category.getAttribute('aria-expanded')) === 'true';
      if (!isCategoryExpanded) {
        await category.click();
      }
    }

    async closeFeatureCategory(categoryName: string) {
      const category = await find.byCssSelector(
        `button[aria-controls=featureCategory_${categoryName}]`
      );
      const isCategoryExpanded = (await category.getAttribute('aria-expanded')) === 'true';
      if (isCategoryExpanded) {
        await category.click();
      }
    }

    async toggleFeatureCategoryVisibility(categoryName: string) {
      await testSubjects.click(`featureCategoryButton_${categoryName}`);
    }

    async clickOnDescriptionOfSpace() {
      await testSubjects.click('descriptionSpaceText');
    }

    async setOnDescriptionOfSpace(descriptionSpace: string) {
      await testSubjects.setValue('descriptionSpaceText', descriptionSpace);
    }

    async clickOnDeleteSpaceButton(spaceName: string) {
      await testSubjects.click(`${spaceName}-deleteSpace`);
    }

    async setSpaceNameTobeDeleted(spaceName: string) {
      await testSubjects.setValue('deleteSpaceInput', spaceName);
    }

    async cancelDeletingSpace() {
      await testSubjects.click('confirmModalCancelButton');
    }

    async confirmDeletingSpace() {
      await testSubjects.click('confirmModalConfirmButton');
    }

    async clickOnSpaceb() {
      await testSubjects.click('space-avatar-space_b');
    }

    async goToSpecificSpace(spaceName: string) {
      await testSubjects.click(`${spaceName}-gotoSpace`);
    }

    async clickSpaceAvatar(spaceId: string) {
      return await retry.try(async () => {
        log.info(`SpaceSelectorPage:clickSpaceAvatar(${spaceId})`);
        await testSubjects.click(`space-avatar-${spaceId}`);
        await PageObjects.common.sleep(1000);
      });
    }
  }

  return new SpaceSelectorPage();
}
