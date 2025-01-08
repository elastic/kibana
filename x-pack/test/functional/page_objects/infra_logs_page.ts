/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutOptionsUrlState } from '@kbn/infra-plugin/public/containers/logs/log_flyout';
import querystring from 'querystring';
import { encode } from '@kbn/rison';
import type { PositionStateInUrl } from '@kbn/infra-plugin/public/observability_logs/log_stream_position_state/src/url_state_storage_service';
import { FilterStateInUrl } from '@kbn/infra-plugin/public/observability_logs/log_stream_query_state';
import { FtrProviderContext } from '../ftr_provider_context';

export interface TabsParams {
  stream: {
    logPosition?: Partial<PositionStateInUrl>;
    logFilter?: Partial<FilterStateInUrl>;
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
      let qs = '';
      if (params) {
        const parsedParams: Record<string, string> = {};

        for (const key in params) {
          if (Object.hasOwn(params, key)) {
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

    async getLogStream() {
      return await testSubjects.find('logStream');
    },
  };
}

type LogsUiTab = 'log-categories' | 'log-rate' | 'settings' | 'stream';
