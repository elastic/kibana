/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function InfraLogsPageProvider({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);

  return {
    async navigateTo() {
      await pageObjects.common.navigateToApp('infraLogs');
    },

    async navigateToTab<T extends LogsUiTab>(logsUiTab: T) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraLogs',
        `/${logsUiTab}`,
        '',
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },
  };
}

type LogsUiTab = 'log-categories' | 'log-rate';
