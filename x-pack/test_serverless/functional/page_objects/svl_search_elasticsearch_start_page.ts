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
        expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/indices/index_details');
      });
    },
    async expectToBeOnIndexListPage() {
      await retry.tryForTime(60 * 1000, async () => {
        expect(await browser.getCurrentUrl()).contain(
          '/app/management/data/index_management/indices'
        );
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
    async expectAnalyzeLogsLink() {
      await testSubjects.existOrFail('analyzeLogsBtn');
      expect(await testSubjects.getAttribute('analyzeLogsBtn', 'href')).equal(
        'https://www.elastic.co/guide/en/serverless/current/elasticsearch-ingest-your-data.html'
      );
      expect(await testSubjects.getAttribute('analyzeLogsBtn', 'target')).equal('_blank');
    },
    async expectO11yTrialLink() {
      await testSubjects.existOrFail('startO11yTrialBtn');
      expect(await testSubjects.getAttribute('startO11yTrialBtn', 'href')).equal(
        'https://fake-cloud.elastic.co/projects/create/observability/start'
      );
      expect(await testSubjects.getAttribute('startO11yTrialBtn', 'target')).equal('_blank');
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
  };
}
