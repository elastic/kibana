/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

interface SearchResult {
  label: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function NavigationalSearchProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  class NavigationalSearch {
    async focus() {
      const field = await testSubjects.find('nav-search-input');
      await field.click();
    }

    async blur() {
      await testSubjects.click('helpMenuButton');
      await testSubjects.click('helpMenuButton');
      await find.waitForDeletedByCssSelector('.navSearch__panel');
    }

    async searchFor(
      term: string,
      { clear = true, wait = true }: { clear?: boolean; wait?: boolean } = {}
    ) {
      if (clear) {
        await this.clearField();
      }
      const field = await testSubjects.find('nav-search-input');
      await field.type(term);
      if (wait) {
        await this.waitForResultsLoaded();
      }
    }

    async clearField() {
      const field = await testSubjects.find('nav-search-input');
      await field.clearValueWithKeyboard();
    }

    async isPopoverDisplayed() {
      return await find.existsByCssSelector('.navSearch__panel');
    }

    async clickOnOption(index: number) {
      const options = await testSubjects.findAll('nav-search-option');
      await options[index].click();
    }

    async waitForResultsLoaded() {
      await testSubjects.exists('nav-search-option');
      // results are emitted in multiple batches. Each individual batch causes a re-render of
      // the component, causing the current elements to become stale. We can't perform DOM access
      // without heavy flakiness in this situation.
      // there is NO ui indication of any kind to detect when all the emissions are done,
      // so we are forced to fallback to awaiting a given amount of time once the first options are displayed.
      await delay(3000);
    }

    async getDisplayedResults() {
      const resultElements = await testSubjects.findAll('nav-search-option');
      return Promise.all(resultElements.map((el) => this.convertResultElement(el)));
    }

    private async convertResultElement(resultEl: WebElementWrapper): Promise<SearchResult> {
      const labelEl = await find.allDescendantDisplayedByCssSelector(
        '.euiSelectableTemplateSitewide__listItemTitle',
        resultEl
      );
      const label = await labelEl[0].getVisibleText();

      return {
        label,
      };
    }
  }

  // nav-search-popover
  // nav-search-option
  // euiSelectableTemplateSitewide__listItemTitle
  // euiSelectableTemplateSitewide__optionMeta

  return new NavigationalSearch();
}
