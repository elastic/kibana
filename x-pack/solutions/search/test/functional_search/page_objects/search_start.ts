/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchStartProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  return {
    async expectToBeOnStartPage() {
      await testSubjects.existOrFail('elasticsearchStartPage', { timeout: 2000 });
    },
    async expectToBeOnCreateIndexPage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/indices/create');
      await testSubjects.existOrFail('elasticsearchCreateIndexPage', { timeout: 2000 });
    },
    async expectToBeOnIndexDetailsPage() {
      await retry.tryForTime(60 * 1000, async () => {
        expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/indices/index_details');
      });
    },
    async expectToBeOnIndexListPage() {
      await retry.tryForTime(60 * 1000, async () => {
        expect(await browser.getCurrentUrl()).contain(
          '/app/elasticsearch/index_management/indices'
        );
      });
    },
    async expectToBeOnSearchHomepagePage() {
      await retry.tryForTime(60 * 1000, async () => {
        expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/home');
      });
    },
    async expectToBeOnMLFileUploadPage() {
      await retry.tryForTime(60 * 1000, async () => {
        expect(await browser.getCurrentUrl()).contain('/app/ml/filedatavisualizer');
      });
    },
    async expectIndexNameToExist() {
      await testSubjects.existOrFail('indexNameField');
    },
    async setIndexNameValue(value: string) {
      await testSubjects.existOrFail('indexNameField');
      await testSubjects.setValue('indexNameField', value);
    },
    async expectCloseCreateIndexButtonExists() {
      await testSubjects.existOrFail('closeCreateIndex');
    },
    async clickCloseCreateIndexButton() {
      await testSubjects.existOrFail('closeCreateIndex');
      await testSubjects.click('closeCreateIndex');
    },
    async expectSkipButtonExists() {
      await testSubjects.existOrFail('createIndexSkipBtn');
    },
    async clickSkipButton() {
      await testSubjects.existOrFail('createIndexSkipBtn');
      const element = await testSubjects.find('createIndexSkipBtn');
      await element.scrollIntoView();
      await testSubjects.click('createIndexSkipBtn');
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
    async expectCreateIndexCodeView() {
      await testSubjects.existOrFail('createIndexCodeView');
    },
    async expectCreateIndexUIView() {
      await testSubjects.existOrFail('createIndexUIView');
    },
    async clickUIViewButton() {
      await testSubjects.existOrFail('createIndexUIViewBtn');
      await testSubjects.click('createIndexUIViewBtn');
    },
    async clickCodeViewButton() {
      await testSubjects.existOrFail('createIndexCodeViewBtn');
      await testSubjects.click('createIndexCodeViewBtn');
    },
    async clickFileUploadLink() {
      await testSubjects.existOrFail('uploadFileLink');
      await testSubjects.click('uploadFileLink');
    },

    async expectAPIKeyVisibleInCodeBlock(apiKey: string) {
      await testSubjects.existOrFail('createIndex-code-block');
      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('createIndex-code-block')).to.contain(apiKey);
      });
    },

    async expectAPIKeyPreGenerated() {
      await testSubjects.existOrFail('apiKeyHasBeenGenerated');
    },

    async expectAPIKeyNotPreGenerated() {
      await testSubjects.existOrFail('apiKeyHasNotBeenGenerated');
    },

    async expectAPIKeyFormNotAvailable() {
      await testSubjects.missingOrFail('apiKeyHasNotBeenGenerated');
      await testSubjects.missingOrFail('apiKeyHasBeenGenerated');
    },
    async expectAnalyzeLogsIntegrationLink() {
      await testSubjects.existOrFail('analyzeLogsBrowseIntegrations');
      expect(await testSubjects.getAttribute('analyzeLogsBrowseIntegrations', 'href')).match(
        /^https?\:\/\/.*\/app\/integrations\/browse\/observability/
      );

      expect(await testSubjects.getAttribute('analyzeLogsBrowseIntegrations', 'target')).equal(
        '_blank'
      );
    },
    async expectCreateO11ySpaceBtn() {
      await testSubjects.existOrFail('createO11ySpaceBtn');
      expect(await testSubjects.getAttribute('createO11ySpaceBtn', 'href')).match(
        /^https?\:\/\/.*\/app\/management\/kibana\/spaces\/create/
      );
      expect(await testSubjects.getAttribute('createO11ySpaceBtn', 'target')).equal('_blank');
    },
    async clearSkipEmptyStateStorageFlag() {
      await browser.removeLocalStorageItem('search_onboarding_global_empty_state_skip');
    },
  };
}
