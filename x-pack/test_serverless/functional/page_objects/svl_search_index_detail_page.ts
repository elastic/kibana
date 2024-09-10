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
    async expectToBeIndexDetailPage() {
      expect(await browser.getCurrentUrl()).contain('/index_details');
    },
    async expectIndexDetailPageHeader() {
      await testSubjects.existOrFail('searchIndexDetailsHeader', { timeout: 2000 });
    },
    async expectAPIReferenceDocLinkExists() {
      await testSubjects.existOrFail('ApiReferenceDoc', { timeout: 2000 });
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
    async expectMoreOptionsActionButtonExists() {
      await testSubjects.existOrFail('moreOptionsActionButton');
    },
    async clickMoreOptionsActionsButton() {
      await testSubjects.click('moreOptionsActionButton');
    },
    async expectMoreOptionsOverviewMenuIsShown() {
      await testSubjects.existOrFail('moreOptionsContextMenu');
    },
    async expectDeleteIndexButtonExists() {
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
    async clickPageReload() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.click('reloadButton', 2000);
      });
    },
  };
}
