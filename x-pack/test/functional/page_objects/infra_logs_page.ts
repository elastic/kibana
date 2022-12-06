/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutOptionsUrlState } from '@kbn/infra-plugin/public/containers/logs/log_flyout';
import { LogPositionUrlState } from '@kbn/infra-plugin/public/containers/logs/log_position';
import querystring from 'querystring';
import { encode } from '@kbn/rison';
import { FtrProviderContext } from '../ftr_provider_context';

export interface TabsParams {
  stream: {
    logPosition?: Partial<LogPositionUrlState>;
    flyoutOptions?: Partial<FlyoutOptionsUrlState>;
  };
  settings: never;
  'log-categories': any;
  'log-rate': any;
}

export function InfraLogsPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);

  return {
    /**
     * URL Navigation
     */
    async navigateTo() {
      await pageObjects.common.navigateToApp('infraLogs');
    },

    async navigateToTab<T extends LogsUiTab>(logsUiTab: T, params?: TabsParams[T]) {
      let qs = '';
      if (params) {
        const parsedParams: Record<string, string> = {};

        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            const value = params[key];
            parsedParams[key] = encode(value);
          }
        }
        qs = '?' + querystring.stringify(parsedParams);
      }

      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraLogs',
        `/${logsUiTab}`,
        qs,
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },

    /**
     * Page
     */
    async getPage() {
      return await testSubjects.find('logStreamPage');
    },
    async getMissingIndicesPage() {
      return await testSubjects.find('noDataPage');
    },

    /**
     * Header
     */
    async getLogSettingsHeaderLink(): Promise<WebElementWrapper> {
      return await testSubjects.find('logSettingsHeaderLink');
    },

    /**
     * Log stream
     */
    async getLogStream() {
      return await testSubjects.find('logStream');
    },
  };
}

type LogsUiTab = 'log-categories' | 'log-rate' | 'settings' | 'stream';
