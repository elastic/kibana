/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function TagManagementPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['header', 'common', 'savedObjects', 'settings']);
  const retry = getService('retry');

  class TagManagementPage {
    /**
     * Navigate to the tag management section, by accessing the management app, then clicking
     * on the `tags` link.
     */
    async navigateTo() {
      await PageObjects.settings.navigateTo();
      await testSubjects.click('tags');
      await this.waitUntilTableIsLoaded();
    }

    /**
     * Wait until the tags table is displayed and is not in a the loading state
     */
    async waitUntilTableIsLoaded() {
      return retry.try(async () => {
        const isLoaded = await find.existsByDisplayedByCssSelector(
          '*[data-test-subj="tagsManagementTable"]:not(.euiBasicTable-loading)'
        );

        if (isLoaded) {
          return true;
        } else {
          throw new Error('Waiting');
        }
      });
    }

    /**
     * Type given `term` in the table's search bar
     */
    async searchForTerm(term: string) {
      const searchBox = await testSubjects.find('tagsManagementSearchBar');
      await searchBox.clearValue();
      await searchBox.type(term);
      await searchBox.pressKeys(browser.keys.ENTER);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await this.waitUntilTableIsLoaded();
    }

    /**
     * Returns true if the `Create new tag` button is visible, false otherwise.
     */
    async isCreateButtonVisible() {
      return await testSubjects.exists('createTagButton');
    }

    /**
     * Returns true if the `Delete tag` action button in the tag rows is visible, false otherwise.
     */
    async isDeleteButtonVisible() {
      return await testSubjects.exists('tagsTableAction-delete');
    }

    /**
     * Returns true if the `Edit tag` action button in the tag rows is visible, false otherwise.
     */
    async isEditButtonVisible() {
      return await testSubjects.exists('tagsTableAction-edit');
    }

    /**
     * Return the (table ordered) name of the tags currently displayed in the table.
     */
    async getDisplayedTagNames() {
      const tags = await this.getDisplayedTagsInfo();
      return tags.map((tag) => tag.name);
    }

    async isConnectionLinkDisplayed(tagName: string) {
      const tags = await this.getDisplayedTagsInfo();
      const tag = tags.find((t) => t.name === tagName);
      return tag ? tag.connectionCount === undefined : false;
    }

    /**
     * Return the info of all the tags currently displayed in the table (in table's order)
     */
    async getDisplayedTagsInfo() {
      const rows = await testSubjects.findAll('tagsTableRow');
      return Promise.all([...rows.map(parseTableRow)]);
    }
  }

  const parseTableRow = async (row: WebElementWrapper) => {
    const dom = await row.parseDomContent();

    const connectionsText = dom.findTestSubject('tagsTableRowConnectionsLink').text();
    const rawConnectionCount = connectionsText.replace(/[^0-9]/g, '');
    const connectionCount = rawConnectionCount ? parseInt(rawConnectionCount, 10) : undefined;

    return {
      name: dom.findTestSubject('tagsTableRowName').find('.euiTableCellContent').text(),
      description: dom
        .findTestSubject('tagsTableRowDescription')
        .find('.euiTableCellContent')
        .text(),
      connectionCount,
    };
  };

  return new TagManagementPage();
}
