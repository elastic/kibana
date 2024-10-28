/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchHomePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async expectToBeOnHomepage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/home');
    },
    async expectToNotBeOnHomepage() {
      expect(await browser.getCurrentUrl()).not.contain('/app/elasticsearch/home');
    },
    async expectHomepageHeader() {
      await testSubjects.existOrFail('search-homepage-header', { timeout: 2000 });
    },
    async expectConsoleLinkExists() {
      await testSubjects.existOrFail('searchHomepageEmbeddedConsoleButton');
    },
    async clickConsoleLink() {
      await testSubjects.click('searchHomepageEmbeddedConsoleButton');
    },
    async expectEndpointsLinkExists() {
      await testSubjects.existOrFail('searchHomepageEndpointsHeaderActionEndpointsApiKeysButton');
    },
    async clickEndpointsLink() {
      await testSubjects.click('searchHomepageEndpointsHeaderActionEndpointsApiKeysButton');
    },
    async expectConnectionDetailsFlyoutToBeOpen() {
      await testSubjects.existOrFail('connectionDetailsModalTitle');
    },
    async closeConnectionDetailsFlyout() {
      await testSubjects.existOrFail('euiFlyoutCloseButton');
      await testSubjects.click('euiFlyoutCloseButton');
    },
    async expectEndpointsTabIsAvailable() {
      await testSubjects.existOrFail('connectionDetailsTabBtn-endpoints');
      await testSubjects.click('connectionDetailsTabBtn-endpoints');
      await testSubjects.existOrFail('connectionDetailsEsUrl');
      await testSubjects.existOrFail('connectionDetailsCloudIdSwitch');
    },
    async expectAPIKeyTabIsAvailable() {
      await testSubjects.existOrFail('connectionDetailsTabBtn-apiKeys');
      await testSubjects.click('connectionDetailsTabBtn-apiKeys');
      await testSubjects.existOrFail('connectionDetailsApiKeyNameInput');
      await testSubjects.existOrFail('connectionDetailsApiKeySubmitBtn');
    },
    async createApiKeyInFlyout(keyName: string) {
      await testSubjects.existOrFail('connectionDetailsApiKeyNameInput');
      await testSubjects.existOrFail('connectionDetailsApiKeySubmitBtn');
      await testSubjects.setValue('connectionDetailsApiKeyNameInput', keyName);
      await testSubjects.click('connectionDetailsApiKeySubmitBtn');
      await testSubjects.existOrFail('connectionDetailsApiKeySuccessForm');
      await testSubjects.existOrFail('connectionDetailsApiKeyValueRow');
      expect(await testSubjects.getVisibleText('connectionDetailsApiKeySuccessForm')).contain(
        keyName
      );
    },
    async expectAIAssistantToExist() {
      await testSubjects.existOrFail('AiAssistantAppNavControlButton');
    },
  };
}
