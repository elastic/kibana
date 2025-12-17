/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from './ftr_provider_context';

export function SearchGettingStartedProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async expectSearchGettingStartedIsLoaded() {
      await testSubjects.existOrFail('search-getting-started', { timeout: 2000 });
    },
    async expectToBeOnGettingStartedPage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/getting_started');
    },
    async expectToNotBeOnGettingStartedPage() {
      expect(await browser.getCurrentUrl()).not.contain('/app/elasticsearch/getting_started');
    },
    async selectAddDataOption(optionDataTestSubj: string) {
      await testSubjects.click('gettingStartedAddDataButton');
      await testSubjects.click(optionDataTestSubj);
    },
    async selectCodingLanguage(language: string) {
      await testSubjects.existOrFail('codeExampleLanguageSelect');
      await testSubjects.click('codeExampleLanguageSelect');
      await testSubjects.existOrFail(`lang-option-${language}`);
      await testSubjects.click(`lang-option-${language}`);
      expect(
        (await testSubjects.getVisibleText('codeExampleLanguageSelect')).toLowerCase()
      ).contain(language);
    },
    async expectCodeSampleContainsValue(value: string) {
      const tstSubjId = 'gettingStartedExampleCode';
      await testSubjects.existOrFail(tstSubjId);
      expect(await testSubjects.getVisibleText(tstSubjId)).contain(value);
    },
  };
}
