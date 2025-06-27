/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '@kbn/test-suites-xpack/functional/ftr_provider_context';

export class QueryBarProvider extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly find = this.ctx.getService('find');

  public getQueryBar(parentSelector?: string) {
    const QUERY_INPUT_SELECTOR = parentSelector ? `${parentSelector} > queryInput` : 'queryInput';

    const getQueryString = async (): Promise<string> => {
      return (await this.testSubjects.getAttribute(QUERY_INPUT_SELECTOR, 'value')) ?? '';
    };

    const setQuery = async (query: string): Promise<void> => {
      this.log.debug(`QueryBar.setQuery(${query})`);
      // Extra caution used because of flaky test here: https://github.com/elastic/kibana/issues/16978 doesn't seem
      // to be actually setting the query in the query input based off
      await this.retry.try(async () => {
        await this.testSubjects.click(QUERY_INPUT_SELECTOR);

        // this.testSubjects.setValue uses input.clearValue which wasn't working, but input.clearValueWithKeyboard does.
        // So the following lines do the same thing as input.setValue but with input.clearValueWithKeyboard instead.
        const input = await this.find.activeElement();
        await input.clearValueWithKeyboard();
        await input.type(query);
        const currentQuery = await getQueryString();
        if (currentQuery !== query) {
          throw new Error(
            `Failed to set query input to ${query}, instead query is ${currentQuery}`
          );
        }
      });
    };

    const clearQuery = async (): Promise<void> => {
      await setQuery('');
      await this.common.pressTabKey(); // move outside of input into language switcher
      await this.common.pressTabKey(); // move outside of language switcher so time picker appears
    };

    const submitQuery = async (): Promise<void> => {
      this.log.debug('QueryBar.submitQuery');
      await this.testSubjects.click(QUERY_INPUT_SELECTOR);
      await this.common.pressEnterKey();
      await this.header.waitUntilLoadingHasFinished();
    };

    return {
      setQuery,
      clearQuery,
      submitQuery,
    };
  }
}
