/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'security', 'savedObjects', 'tagManagement']);
  const tagManagementPage = PageObjects.tagManagement;

  describe('table bulk actions', () => {
    beforeEach(async () => {
      await esArchiver.load('functional_base');
      await tagManagementPage.navigateTo();
    });
    afterEach(async () => {
      await esArchiver.unload('functional_base');
    });

    describe('bulk delete', () => {
      it('deletes multiple tags', async () => {
        await tagManagementPage.selectTagByName('tag-1');
        await tagManagementPage.selectTagByName('tag-3');

        await tagManagementPage.clickOnAction('delete');

        await PageObjects.common.clickConfirmOnModal();
        await tagManagementPage.waitUntilTableIsLoaded();

        const displayedTags = await tagManagementPage.getDisplayedTagNames();
        expect(displayedTags.length).to.be(3);
        expect(displayedTags).to.eql(['my-favorite-tag', 'tag with whitespace', 'tag-2']);
      });
    });

    describe('clear selection', () => {
      it('clears the current selection', async () => {
        await tagManagementPage.selectTagByName('tag-1');
        await tagManagementPage.selectTagByName('tag-3');

        await tagManagementPage.clickOnAction('clear_selection');

        await tagManagementPage.waitUntilTableIsLoaded();

        expect(await tagManagementPage.isActionMenuButtonDisplayed()).to.be(false);
      });
    });
  });
}
