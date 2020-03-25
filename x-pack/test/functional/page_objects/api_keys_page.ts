/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function ApiKeysPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async noAPIKeysHeading() {
      const messageElement = await testSubjects.find('noApiKeysHeader');
      const message = await messageElement.getVisibleText();
      return message;
    },

    async getGoToConsoleButton() {
      return await testSubjects.find('goToConsoleButton');
    },

    async apiKeysPermissionDeniedMessage() {
      return await testSubjects.getVisibleText('apiKeysPermissionDeniedMessage');
    },
  };
}
