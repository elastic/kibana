/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchIndexDetailPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  const expectIndexDetailPageHeader = async function () {
    await testSubjects.existOrFail('searchIndexDetailsHeader', { timeout: 2000 });
  };
  const expectSearchIndexDetailsTabsExists = async function () {
    await testSubjects.existOrFail('dataTab');
    await testSubjects.existOrFail('mappingsTab');
    await testSubjects.existOrFail('settingsTab');
  };

  return {
    expectIndexDetailPageHeader,
    expectSearchIndexDetailsTabsExists,
    async expectAPIReferenceDocLinkExists() {
      await testSubjects.existOrFail('ApiReferenceDoc', { timeout: 2000 });
    },
    async expectIndexDetailsPageIsLoaded() {
      await expectIndexDetailPageHeader();
      await expectSearchIndexDetailsTabsExists();
    },
    async expectActionItemReplacedWhenHasDocs() {
      await testSubjects.missingOrFail('ApiReferenceDoc', { timeout: 2000 });
      await testSubjects.existOrFail('useInPlaygroundLink', { timeout: 5000 });
      await testSubjects.existOrFail('viewInDiscoverLink', { timeout: 5000 });
    },
    async expectConnectionDetails() {
      await testSubjects.existOrFail('connectionDetailsEndpoint', { timeout: 2000 });
      expect(await (await testSubjects.find('connectionDetailsEndpoint')).getVisibleText()).match(
        /^https?\:\/\/.*(\:\d+)?/
      );
    },
    async expectQuickStats() {
      await testSubjects.existOrFail('quickStats', { timeout: 2000 });
      const quickStatsElem = await testSubjects.find('quickStats');
      const quickStatsDocumentElem = await quickStatsElem.findByTestSubject(
        'QuickStatsDocumentCount'
      );
      expect(await quickStatsDocumentElem.getVisibleText()).to.contain('Document count\n0');
      expect(await quickStatsDocumentElem.getVisibleText()).not.to.contain('Total\n0');
      await quickStatsDocumentElem.click();
      expect(await quickStatsDocumentElem.getVisibleText()).to.contain('Total\n0\nDeleted\n0');
    },

    async expectQuickStatsToHaveIndexStatus() {
      await testSubjects.existOrFail('QuickStatsIndexStatus');
    },

    async expectQuickStatsToHaveIndexStorage(size?: string) {
      await testSubjects.existOrFail('QuickStatsStorage');
      if (!size) return;

      const quickStatsElem = await testSubjects.find('quickStats');
      const quickStatsStorageElem = await quickStatsElem.findByTestSubject('QuickStatsStorage');
      expect(await quickStatsStorageElem.getVisibleText()).to.contain(`Storage\n${size}`);
    },

    async expectQuickStatsToHaveDocumentCount(count: number) {
      await testSubjects.existOrFail('QuickStatsDocumentCount');
      const quickStatsElem = await testSubjects.find('quickStats');
      const quickStatsDocumentElem = await quickStatsElem.findByTestSubject(
        'QuickStatsDocumentCount'
      );
      expect(await quickStatsDocumentElem.getVisibleText()).to.contain(`Document count\n${count}`);
    },

    async expectQuickStatsAIMappings() {
      await testSubjects.existOrFail('quickStats', { timeout: 2000 });
      await testSubjects.existOrFail('QuickStatsAIMappings');
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
    async expectAPIReferenceDocLinkMissingInMoreOptions() {
      await testSubjects.missingOrFail('moreOptionsApiReference', { timeout: 2000 });
    },
    async expectDeleteIndexButtonToBeDisabled() {
      await testSubjects.existOrFail('moreOptionsDeleteIndex');
      const deleteIndexButton = await testSubjects.isEnabled('moreOptionsDeleteIndex');
      expect(deleteIndexButton).to.be(false);
      await testSubjects.moveMouseTo('moreOptionsDeleteIndex');
      await testSubjects.existOrFail('moreOptionsDeleteIndexTooltip');
    },
    async expectDeleteIndexButtonToBeEnabled() {
      await testSubjects.existOrFail('moreOptionsDeleteIndex');
      const deleteIndexButton = await testSubjects.isEnabled('moreOptionsDeleteIndex');
      expect(deleteIndexButton).to.be(true);
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
    async expectTabsExists() {
      await testSubjects.existOrFail('mappingsTab', { timeout: 2000 });
      await testSubjects.existOrFail('dataTab', { timeout: 2000 });
    },
    async changeTab(tab: 'dataTab' | 'mappingsTab' | 'settingsTab') {
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
    async expectEditSettingsIsDisabled() {
      await testSubjects.existOrFail('indexDetailsSettingsEditModeSwitch', { timeout: 2000 });
      const isEditSettingsButtonDisabled = await testSubjects.isEnabled(
        'indexDetailsSettingsEditModeSwitch'
      );
      expect(isEditSettingsButtonDisabled).to.be(false);
      await testSubjects.moveMouseTo('indexDetailsSettingsEditModeSwitch');
      await testSubjects.existOrFail('indexDetailsSettingsEditModeSwitchToolTip');
    },
    async expectEditSettingsToBeEnabled() {
      await testSubjects.existOrFail('indexDetailsSettingsEditModeSwitch', { timeout: 2000 });
      const isEditSettingsButtonDisabled = await testSubjects.isEnabled(
        'indexDetailsSettingsEditModeSwitch'
      );
      expect(isEditSettingsButtonDisabled).to.be(true);
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

    async expectHasSampleDocuments() {
      await testSubjects.existOrFail('ingestDataCodeExample-code-block');
      expect(await testSubjects.getVisibleText('ingestDataCodeExample-code-block')).to.contain(
        'Yellowstone National Park'
      );
      expect(await testSubjects.getVisibleText('ingestDataCodeExample-code-block')).to.contain(
        'Yosemite National Park'
      );
      expect(await testSubjects.getVisibleText('ingestDataCodeExample-code-block')).to.contain(
        'Rocky Mountain National Park'
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
    async expectDeleteDocumentActionIsDisabled() {
      await testSubjects.existOrFail('documentMetadataButton');
      await testSubjects.click('documentMetadataButton');
      await testSubjects.existOrFail('deleteDocumentButton');
      const isDeleteDocumentEnabled = await testSubjects.isEnabled('deleteDocumentButton');
      expect(isDeleteDocumentEnabled).to.be(false);
      await testSubjects.moveMouseTo('deleteDocumentButton');
      await testSubjects.existOrFail('deleteDocumentButtonToolTip');
    },
    async expectDeleteDocumentActionToBeEnabled() {
      await testSubjects.existOrFail('documentMetadataButton');
      await testSubjects.click('documentMetadataButton');
      await testSubjects.existOrFail('deleteDocumentButton');
      const isDeleteDocumentEnabled = await testSubjects.isEnabled('deleteDocumentButton');
      expect(isDeleteDocumentEnabled).to.be(true);
    },

    async openIndicesDetailFromIndexManagementIndicesListTable(indexOfRow: number) {
      const indexList = await testSubjects.findAll('indexTableIndexNameLink');
      await indexList[indexOfRow].click();
      await retry.waitFor('index details page title to show up', async () => {
        return (await testSubjects.isDisplayed('searchIndexDetailsHeader')) === true;
      });
    },

    async expectBreadcrumbNavigationWithIndexName(indexName: string) {
      await testSubjects.existOrFail('euiBreadcrumb');
      expect(await testSubjects.getVisibleText('breadcrumb last')).to.contain(indexName);
    },

    async clickOnIndexManagementBreadcrumb() {
      const breadcrumbs = await testSubjects.findAll('breadcrumb');
      for (const breadcrumb of breadcrumbs) {
        if ((await breadcrumb.getVisibleText()) === 'Index Management') {
          await breadcrumb.click();
          return;
        }
      }
    },

    async expectAddFieldToBeDisabled() {
      await testSubjects.existOrFail('indexDetailsMappingsAddField');
      const isMappingsFieldEnabled = await testSubjects.isEnabled('indexDetailsMappingsAddField');
      expect(isMappingsFieldEnabled).to.be(false);
      await testSubjects.moveMouseTo('indexDetailsMappingsAddField');
      await testSubjects.existOrFail('indexDetailsMappingsAddFieldTooltip');
    },

    async expectAddFieldToBeEnabled() {
      await testSubjects.existOrFail('indexDetailsMappingsAddField');
      const isMappingsFieldEnabled = await testSubjects.isEnabled('indexDetailsMappingsAddField');
      expect(isMappingsFieldEnabled).to.be(true);
    },
  };
}
