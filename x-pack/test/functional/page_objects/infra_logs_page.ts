/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import testSubjSelector from '@kbn/test-subj-selector';
// import moment from 'moment';
import { encode, RisonValue } from 'rison-node';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraLogsPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);

  return {
    async navigateTo() {
      await pageObjects.common.navigateToApp('infraLogs');
    },

    async navigateToTab(logsUiTab: LogsUiTab, params?: Record<string, RisonValue>) {
      let queryString = '';
      if (params) {
        queryString = Object.keys(params).reduce((qs, key, idx) => {
          qs += (idx > 0 ? '&' : '') + `${key}=${encode(params[key])}`;

          return qs;
        }, '?');
      }
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraLogs',
        `/${logsUiTab}`,
        queryString,
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },

    async getLogStream() {
      return await testSubjects.find('logStream');
    },
  };
}

type LogsUiTab = 'log-categories' | 'log-rate' | 'settings' | 'stream';
