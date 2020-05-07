/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export function LogEntryCategoriesPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['infraLogs']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateTo() {
      await pageObjects.infraLogs.navigateToTab('log-categories');
    },

    async getSetupScreen(): Promise<WebElementWrapper> {
      return await testSubjects.find('logEntryCategoriesSetupPage');
    },
  };
}
