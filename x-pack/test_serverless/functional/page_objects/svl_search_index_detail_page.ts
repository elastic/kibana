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
  const retry = getService('retry');

  return {
    async expectIndexDetailPageHeader() {
      await testSubjects.existOrFail('searchIndexDetailsHeader', { timeout: 2000 });
    },
    async expectAPIReferenceDocLinkExists() {
      await testSubjects.existOrFail('ApiReferenceDoc', { timeout: 2000 });
    },
    async expectUseInPlaygroundLinkExists() {
      await testSubjects.existOrFail('useInPlaygroundLink', { timeout: 5000 });
    },
    async expectBackToIndicesButtonExists() {
      await testSubjects.existOrFail('backToIndicesButton', { timeout: 2000 });
    },
    async clickBackToIndicesButton() {
      await testSubjects.click('backToIndicesButton');
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

    async expectAddDocumentCodeExamples() {
      await testSubjects.existOrFail('SearchIndicesAddDocumentsCode', { timeout: 2000 });
    },

    async expectHasIndexDocuments() {
      await retry.try(async () => {
        await testSubjects.existOrFail('search-index-documents-result', { timeout: 2000 });
      });
    },

    async expectMoreOptionsActionButtonExists() {
      await testSubjects.existOrFail('moreOptionsActionButton');
    },
    async clickMoreOptionsActionsButton() {
      await testSubjects.click('moreOptionsActionButton');
    },
    async expectMoreOptionsOverviewMenuIsShown() {
      await testSubjects.existOrFail('moreOptionsContextMenu');
    },
    async expectPlaygroundButtonExistsInMoreOptions() {
      await testSubjects.existOrFail('moreOptionsPlayground');
    },
    async expectToNavigateToPlayground(indexName: string) {
      await testSubjects.click('moreOptionsPlayground');
      expect(await browser.getCurrentUrl()).contain(
        `/search_playground/chat?default-index=${indexName}`
      );
      await testSubjects.existOrFail('chatPage');
    },
    async expectAPIReferenceDocLinkExistsInMoreOptions() {
      await testSubjects.existOrFail('moreOptionsApiReference', { timeout: 2000 });
    },
    async expectDeleteIndexButtonExistsInMoreOptions() {
      await testSubjects.existOrFail('moreOptionsDeleteIndex');
    },
    async clickDeleteIndexButton() {
      await testSubjects.click('moreOptionsDeleteIndex');
    },
    async expectDeleteIndexModalExists() {
      await testSubjects.existOrFail('deleteIndexActionModal');
    },
    async clickConfirmingDeleteIndex() {
      await testSubjects.existOrFail('confirmModalConfirmButton');
      await testSubjects.click('confirmModalConfirmButton');
    },
    async expectPageLoadErrorExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('pageLoadError');
      });

      await testSubjects.existOrFail('loadingErrorBackToIndicesButton');
      await testSubjects.existOrFail('reloadButton');
    },
    async expectIndexNotFoundErrorExists() {
      const pageLoadErrorElement = await (
        await testSubjects.find('pageLoadError')
      ).findByClassName('euiTitle');
      expect(await pageLoadErrorElement.getVisibleText()).to.contain('Not Found');
    },
    async clickPageReload() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.click('reloadButton', 2000);
      });
    },
    async expectWithDataTabsExists() {
      await testSubjects.existOrFail('mappingsTab', { timeout: 2000 });
      await testSubjects.existOrFail('dataTab', { timeout: 2000 });
    },
    async expectShouldDefaultToDataTab() {
      expect(await browser.getCurrentUrl()).contain('/data');
    },
    async withDataChangeTabs(tab: 'dataTab' | 'mappingsTab' | 'settingsTab') {
      await testSubjects.click(tab);
    },
    async expectUrlShouldChangeTo(tab: 'data' | 'mappings' | 'settings') {
      expect(await browser.getCurrentUrl()).contain(`/${tab}`);
    },
    async expectMappingsComponentIsVisible() {
      await testSubjects.existOrFail('indexDetailsMappingsToggleViewButton', { timeout: 2000 });
    },
    async expectSettingsComponentIsVisible() {
      await testSubjects.existOrFail('indexDetailsSettingsEditModeSwitch', { timeout: 2000 });
    },
    async expectSelectedLanguage(language: string) {
      await testSubjects.existOrFail('codeExampleLanguageSelect');
      expect(
        (await testSubjects.getVisibleText('codeExampleLanguageSelect')).toLowerCase()
      ).contain(language);
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
    async codeSampleContainsValue(subject: string, value: string) {
      const tstSubjId = `${subject}-code-block`;
      await testSubjects.existOrFail(tstSubjId);
      expect(await testSubjects.getVisibleText(tstSubjId)).contain(value);
    },
    async openConsoleCodeExample() {
      await testSubjects.existOrFail('tryInConsoleButton');
      await testSubjects.click('tryInConsoleButton');
    },

    async expectAPIKeyToBeVisibleInCodeBlock(apiKey: string) {
      await testSubjects.existOrFail('ingestDataCodeExample-code-block');
      expect(await testSubjects.getVisibleText('ingestDataCodeExample-code-block')).to.contain(
        apiKey
      );
    },

    async clickFirstDocumentDeleteAction() {
      await testSubjects.existOrFail('documentMetadataButton');
      await testSubjects.click('documentMetadataButton');
      await testSubjects.existOrFail('deleteDocumentButton');
      await testSubjects.click('deleteDocumentButton');
    },

    async expectDeleteDocumentActionNotVisible() {
      await testSubjects.existOrFail('documentMetadataButton');
      await testSubjects.click('documentMetadataButton');
      await testSubjects.missingOrFail('deleteDocumentButton');
    },
    async openIndicesDetailFromIndexManagementIndicesListTable(indexOfRow: number) {
      const indexList = await testSubjects.findAll('indexTableIndexNameLink');
      await indexList[indexOfRow].click();
      await retry.waitFor('index details page title to show up', async () => {
        return (await testSubjects.isDisplayed('searchIndexDetailsHeader')) === true;
      });
    },

    async expectSearchIndexDetailsTabsExists() {
      await testSubjects.existOrFail('dataTab');
      await testSubjects.existOrFail('mappingsTab');
      await testSubjects.existOrFail('settingsTab');
    },
  };
}
