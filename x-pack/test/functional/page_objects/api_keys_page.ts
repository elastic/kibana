/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function ApiKeysPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async noAPIKeysHeading() {
      return await testSubjects.getVisibleText('noApiKeysHeader');
    },

    async getApiKeyAdminDesc() {
      return await testSubjects.getVisibleText('apiKeyAdminDescriptionCallOut');
    },

    async getGoToConsoleButton() {
      return await testSubjects.find('goToConsoleButton');
    },

    async apiKeysPermissionDeniedMessage() {
      return await testSubjects.getVisibleText('apiKeysPermissionDeniedMessage');
    },

    async clickOnPromptCreateApiKey() {
      return await testSubjects.click('apiKeysCreatePromptButton');
    },

    async clickOnTableCreateApiKey() {
      return await testSubjects.click('apiKeysCreateTableButton');
    },

    async setApiKeyName(apiKeyName: string) {
      return await testSubjects.setValue('apiKeyNameInput', apiKeyName);
    },

    async setApiKeyCustomExpiration(expirationTime: string) {
      return await testSubjects.setValue('apiKeyCustomExpirationInput', expirationTime);
    },

    async submitOnCreateApiKey() {
      return await testSubjects.click('formFlyoutSubmitButton');
    },

    async isApiKeyModalExists() {
      return await find.existsByCssSelector('[role="dialog"]');
    },

    async getNewApiKeyCreation() {
      const euiCallOutHeader = await find.byCssSelector('.euiCallOutHeader__title');
      return euiCallOutHeader.getVisibleText();
    },

    async toggleCustomExpiration() {
      return await testSubjects.click('apiKeyCustomExpirationSwitch');
    },

    async getErrorCallOutText() {
      const alertElem = await find.byCssSelector('[role="dialog"] [role="alert"] .euiText');
      return await alertElem.getVisibleText();
    },

    async getApiKeysFirstPromptTitle() {
      const titlePromptElem = await find.byCssSelector('.euiEmptyPrompt .euiTitle');
      return await titlePromptElem.getVisibleText();
    },

    async deleteAllApiKeyOneByOne() {
      const hasApiKeysToDelete = await testSubjects.exists('apiKeysTableDeleteAction');
      if (hasApiKeysToDelete) {
        const apiKeysToDelete = await testSubjects.findAll('apiKeysTableDeleteAction');
        for (const element of apiKeysToDelete) {
          await element.click();
          await testSubjects.click('confirmModalConfirmButton');
        }
      }
    },

    async bulkDeleteApiKeys() {
      const hasApiKeysToDelete = await testSubjects.exists('checkboxSelectAll', {
        allowHidden: true,
      });
      if (hasApiKeysToDelete) {
        await testSubjects.click('checkboxSelectAll');
        await testSubjects.click('bulkInvalidateActionButton');
        await testSubjects.click('confirmModalConfirmButton');
      }
    },
  };
}
