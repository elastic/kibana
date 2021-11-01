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

    async clickOnCreateApiKey() {
      return await (await find.byCssSelector('a[data-test-subj="createApiKey"]')).click();
    },

    async setApiKeyName(apiKeyName: string) {
      return await (
        await find.byCssSelector('input[data-test-subj="apiKeyName"]')
      ).type(apiKeyName);
    },

    async setApiKeyExpireAfter(expirationTime: string) {
      return await (
        await find.byCssSelector('input[data-test-subj="apiKeyExpireAfter"]')
      ).type(expirationTime);
    },

    async submitOnCreateApiKey() {
      return await (
        await find.byCssSelector('button[data-test-subj="formFlyoutSubmitButton"]')
      ).click();
    },

    async isApiKeyModalExists() {
      return await find.existsByCssSelector('[role="dialog"]');
    },

    async getNewApiKeyCreation() {
      const euiCallOutHeader = await find.byCssSelector('.euiCallOutHeader__title');
      return euiCallOutHeader.getVisibleText();
    },

    async toggleExpireAfter() {
      const toggleExpirationTimeInput = await find.byCssSelector(
        'button[data-test-subj="toggleApiKeyExpireAfter"]'
      );
      return await toggleExpirationTimeInput.click();
    },

    async getErrorCallOutText() {
      const alertElem = await find.byCssSelector('[role="dialog"] [role="alert"] .euiText');
      return await alertElem.getVisibleText();
    },

    async deleteAllApiKey() {
      const hasApiKeysToDelete = await find.existsByCssSelector(
        '.euiBasicTable tbody tr td button.euiButtonIcon'
      );
      if (hasApiKeysToDelete) {
        const apiKeysToDelete = await find.allByCssSelector(
          '.euiBasicTable tbody tr td button.euiButtonIcon'
        );
        for (const element of apiKeysToDelete) {
          await element.click();
          const deleteConfirmationButton = await find.byCssSelector(
            'button[data-test-subj="confirmModalConfirmButton"]'
          );
          await deleteConfirmationButton.click();
        }
      }
    },
  };
}
