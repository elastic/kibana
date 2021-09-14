/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export function LogEntryRatePageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['infraLogs']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateTo() {
      await pageObjects.infraLogs.navigateToTab('log-rate');
    },

    async getSetupScreen(): Promise<WebElementWrapper> {
      return await testSubjects.find('logEntryRateSetupPage');
    },
  };
}
