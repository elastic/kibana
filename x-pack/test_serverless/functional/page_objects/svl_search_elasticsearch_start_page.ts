/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchElasticsearchStartPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  return {
    async expectToBeOnStartPage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/start');
      await testSubjects.existOrFail('elasticsearchStartPage', { timeout: 2000 });
    },
    async expectToBeOnIndexDetailsPage() {
      await retry.tryForTime(60 * 1000, async () => {
        expect(await browser.getCurrentUrl()).contain(
          '/app/management/data/index_management/indices/index_details'
        );
      });
    },
    async expectIndexNameToExist() {
      await testSubjects.existOrFail('indexNameField');
    },
    async setIndexNameValue(value: string) {
      await testSubjects.existOrFail('indexNameField');
      await testSubjects.setValue('indexNameField', value);
    },
    async expectCreateIndexButtonToExist() {
      await testSubjects.existOrFail('createIndexBtn');
    },
    async expectCreateIndexButtonToBeEnabled() {
      await testSubjects.existOrFail('createIndexBtn');
      expect(await testSubjects.isEnabled('createIndexBtn')).equal(true);
    },
    async expectCreateIndexButtonToBeDisabled() {
      await testSubjects.existOrFail('createIndexBtn');
      expect(await testSubjects.isEnabled('createIndexBtn')).equal(false);
    },
    async clickCreateIndexButton() {
      await testSubjects.existOrFail('createIndexBtn');
      expect(await testSubjects.isEnabled('createIndexBtn')).equal(true);
      await testSubjects.click('createIndexBtn');
    },
  };
}
