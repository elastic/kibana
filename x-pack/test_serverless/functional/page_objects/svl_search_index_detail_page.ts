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
  };
}
