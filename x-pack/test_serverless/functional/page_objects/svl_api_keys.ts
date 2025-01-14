/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SecurityApiKey } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../ftr_provider_context';

const APIKEY_MASK = '•'.repeat(60);

export function SvlApiKeysProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['common', 'apiKeys']);
  const retry = getService('retry');
  const es = getService('es');

  const getAPIKeyFromSessionStorage = async () => {
    const sessionStorageKey = await browser.getSessionStorageItem('searchApiKey');
    return sessionStorageKey && JSON.parse(sessionStorageKey);
  };

  return {
    async clearAPIKeySessionStorage() {
      await browser.clearSessionStorage();
    },

    async expectAPIKeyExists() {
      await testSubjects.existOrFail('apiKeyFormAPIKey', { timeout: 1000 });
    },

    async expectAPIKeyAvailable() {
      await testSubjects.existOrFail('apiKeyFormAPIKey');
      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('apiKeyFormAPIKey')).to.be(APIKEY_MASK);
      });
      await testSubjects.click('showAPIKeyButton');
      let apiKey;
      await retry.try(async () => {
        apiKey = await testSubjects.getVisibleText('apiKeyFormAPIKey');
        expect(apiKey).to.be.a('string');
        expect(apiKey.length).to.be(60);
        expect(apiKey).to.not.be(APIKEY_MASK);
      });
      const sessionStorageKey = await getAPIKeyFromSessionStorage();
      expect(sessionStorageKey.encoded).to.eql(apiKey);
    },

    async expectAPIKeyNoPrivileges() {
      await testSubjects.existOrFail('apiKeyFormNoUserPrivileges');
    },

    async getAPIKeyFromSessionStorage() {
      return getAPIKeyFromSessionStorage();
    },

    async getAPIKeyFromUI() {
      let apiKey = '';
      await retry.try(async () => {
        apiKey = await testSubjects.getVisibleText('apiKeyFormAPIKey');
        expect(apiKey).to.not.be(APIKEY_MASK);
      });
      expect(apiKey).to.be.a('string');
      return apiKey;
    },

    async invalidateAPIKey(apiKeyId: string) {
      await es.security.invalidateApiKey({ ids: [apiKeyId] });
    },

    async createAPIKey() {
      await es.security.createApiKey({
        name: 'test-api-key',
        role_descriptors: {},
      });
    },

    async expectAPIKeyCreate() {
      await testSubjects.existOrFail('apiKeyFormAPIKey');
      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('apiKeyFormAPIKey')).to.be(APIKEY_MASK);
      });
      await testSubjects.click('showAPIKeyButton');
      await retry.try(async () => {
        const apiKey = await testSubjects.getVisibleText('apiKeyFormAPIKey');
        expect(apiKey).to.be.a('string');
        expect(apiKey.length).to.be(60);
        expect(apiKey).to.not.be(APIKEY_MASK);
      });
    },

    async deleteAPIKeys() {
      const filterInvalid = (key: SecurityApiKey) => !key.invalidated;

      const { api_keys: apiKeys } = await es.security.getApiKey();

      const validKeys = apiKeys.filter(filterInvalid);

      if (validKeys.length === 0) {
        return;
      }

      await es.security.invalidateApiKey({
        ids: validKeys.map((key) => key.id),
      });
    },

    async expectCreateApiKeyAction() {
      await testSubjects.existOrFail('createAPIKeyButton');
    },

    async createApiKeyFromFlyout() {
      const apiKeyName = 'Happy API Key';
      await testSubjects.click('createAPIKeyButton');
      expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('Create API key');

      await pageObjects.apiKeys.setApiKeyName(apiKeyName);
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
    },

    async expectAPIKeyNotAvailable() {
      await testSubjects.missingOrFail('apiKeyFormAPIKey');
    },
  };
}
