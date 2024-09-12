/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchIndexDetailPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async expectToBeIndexDetailPage() {
      expect(await browser.getCurrentUrl()).contain('/index_details');
    },
    async expectIndexDetailPageHeader() {
      await testSubjects.existOrFail('searchIndexDetailsHeader', { timeout: 2000 });
    },
    async expectIndexDetailPage() {
      await testSubjects.existOrFail('searchIndicesDetailsPage', { timeout: 2000 });
    },
    async expectBackToIndicesButtonExists() {
      await testSubjects.existOrFail('searchIndexDetailsBackToIndicesButton', { timeout: 2000 });
    },
    async clickBackToIndicesButton() {
      await testSubjects.click('searchIndexDetailsBackToIndicesButton');
    },
    async expectBackToIndicesButtonRedirectsToListPage() {
      await testSubjects.existOrFail('indicesList');
    },
    async expectConnectionDetails() {
      await testSubjects.existOrFail('connectionDetailsEndpoint', { timeout: 2000 });
      expect(await (await testSubjects.find('connectionDetailsEndpoint')).getVisibleText()).to.be(
        'https://fakeprojectid.es.fake-domain.cld.elstc.co:443'
      );
    },
    async expectQuickStats() {
      await testSubjects.existOrFail('quickStats', { timeout: 2000 });
      const quickStatsElem = await testSubjects.find('quickStats');
      const quickStatsDocumentElem = await quickStatsElem.findByTestSubject(
        'QuickStatsDocumentCount'
      );
      expect(await quickStatsDocumentElem.getVisibleText()).to.contain('Document count\n0');
      expect(await quickStatsDocumentElem.getVisibleText()).not.to.contain('Index Size\n0b');
      await quickStatsDocumentElem.click();
      expect(await quickStatsDocumentElem.getVisibleText()).to.contain('Index Size\n0b');
    },
    async expectQuickStatsAIMappings() {
      await testSubjects.existOrFail('quickStats', { timeout: 2000 });
      const quickStatsElem = await testSubjects.find('quickStats');
      const quickStatsAIMappingsElem = await quickStatsElem.findByTestSubject(
        'QuickStatsAIMappings'
      );
      await quickStatsAIMappingsElem.click();
      await testSubjects.existOrFail('setupAISearchButton', { timeout: 2000 });
    },

    async expectQuickStatsAIMappingsToHaveVectorFields() {
      const quickStatsDocumentElem = await testSubjects.find('QuickStatsAIMappings');
      await quickStatsDocumentElem.click();
      expect(await quickStatsDocumentElem.getVisibleText()).to.contain('AI Search\n1 Field');
      await testSubjects.missingOrFail('setupAISearchButton', { timeout: 2000 });
    },
  };
}
