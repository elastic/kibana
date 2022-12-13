/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  LogIndexReference,
  LogViewColumnConfiguration,
} from '@kbn/infra-plugin/common/log_views';
import type { FlyoutOptionsUrlState } from '@kbn/infra-plugin/public/containers/logs/log_flyout';
import type { LogPositionUrlState } from '@kbn/infra-plugin/public/containers/logs/log_position';
import { encode } from '@kbn/rison';
import { AnyEventObject } from 'xstate';
import { EventExecutor } from '@xstate/test';
import querystring from 'querystring';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
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
  const pageObjects = getPageObjects(['common', 'observability']);

  /**
   * URL Navigation
   */
  async function navigateTo() {
    await pageObjects.common.navigateToApp('infraLogs');
  }

  async function navigateToTab<T extends LogsUiTab>(logsUiTab: T, params?: TabsParams[T]) {
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
  }

  /**
   * Page
   */
  async function getPage() {
    return await testSubjects.find('logStreamPage');
  }
  async function getMissingIndicesPage() {
    return await testSubjects.find('noDataPage');
  }

  /**
   * Header
   */
  async function getLogSettingsHeaderLink(): Promise<WebElementWrapper> {
    return await testSubjects.find('logSettingsHeaderLink');
  }

  /**
   * Log stream
   */
  async function getLogStream() {
    return await testSubjects.find('logStream');
  }

  const modelStateAssertions = {
    onLogStreamPage: async () => {
      expect(await getPage()).to.be.ok();
      // TODO: check columns
    },
    onLogStreamMissingIndicesPage: async () => {
      expect(await getMissingIndicesPage()).to.be.ok();
    },
  };

  const modelTransitionEffects: Record<
    LogStreamPageTestMachineEvent['type'],
    EventExecutor<unknown, LogStreamPageTestMachineEvent | AnyEventObject>
  > = {
    navigateToLogsUi: async () => {
      await navigateTo();
    },
    clickLogStreamNavigationLink: async () => {
      await pageObjects.observability.clickSolutionNavigationEntry('logs', 'stream');
    },
    clickSettingsHeaderLink: async () => {
      await (await getLogSettingsHeaderLink()).click();
    },
  };

  return {
    getLogSettingsHeaderLink,
    getLogStream,
    getMissingIndicesPage,
    getPage,
    modelStateAssertions,
    modelTransitionEffects,
    navigateTo,
    navigateToTab,
  };
}

export type ExpectedIndexStatus = 'missing' | 'empty' | 'available';

export interface LogViewDescriptor {
  logIndices: LogIndexReference;
  expectedIndexStatus: ExpectedIndexStatus;
  columns: LogViewColumnConfiguration[];
}

export interface LogStreamPageTestMachineContextWithLogView {
  logView: LogViewDescriptor;
}

export interface LogStreamPageTestMachineTypestate {
  value: 'onLogStreamMissingIndicesPage';
  context: LogStreamPageTestMachineContextWithLogView;
}

export type LogStreamPageTestMachineContext = LogStreamPageTestMachineTypestate['context'];

export type LogStreamPageTestMachineEvent =
  | { type: 'navigateToLogsUi' }
  | { type: 'clickLogStreamNavigationLink' }
  | { type: 'clickSettingsHeaderLink' };

type LogsUiTab = 'log-categories' | 'log-rate' | 'settings' | 'stream';
