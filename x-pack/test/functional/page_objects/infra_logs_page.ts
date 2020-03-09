/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import testSubjSelector from '@kbn/test-subj-selector';
// import moment from 'moment';
import { encode, RisonValue } from 'rison-node';
import { FtrProviderContext } from '../ftr_provider_context';
import { LogPositionUrlState } from '../../../../x-pack/plugins/infra/public/containers/logs/log_position/with_log_position_url_state';
import { FlyoutOptionsUrlState } from '../../../../x-pack/plugins/infra/public/containers/logs/log_flyout';

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
    async navigateTo() {
      await pageObjects.common.navigateToApp('infraLogs');
    },

    async navigateToTab<T extends LogsUiTab>(logsUiTab: T, params?: TabsParams[T]) {
      let queryString = '';
      if (params) {
        const qsPairs = [];

        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            const value = (params[key] as unknown) as RisonValue;
            qsPairs.push(`${key}=${encode(value)}`);
          }
        }
        queryString = '?' + qsPairs.join('&');
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
