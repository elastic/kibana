/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHistory } from '../__mocks__/react_router';

import React from 'react';

import { render as testingLibraryRender } from '@testing-library/react';

import { LogicWrapper, Provider, resetContext } from 'kea';

import { of } from 'rxjs';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { ApplicationStart } from '@kbn/core-application-browser';
import { Capabilities } from '@kbn/core-capabilities-common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';

import { mountHttpLogic } from '../shared/http';
import { mountKibanaLogic, KibanaLogicProps } from '../shared/kibana';

export const mockKibanaProps: KibanaLogicProps = {
  application: {
    getUrlForApp: jest.fn(
      (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`
    ),
  } as unknown as ApplicationStart,
  capabilities: {} as Capabilities,
  charts: chartPluginMock.createStartContract(),
  cloud: {
    ...cloudMock.createSetup(),
    ...cloudMock.createStart(),
    isCloudEnabled: false,
  },
  config: {
    ui: {
      enabled: true,
    },
  },
  connectorTypes: [],
  coreSecurity: undefined,
  data: dataPluginMock.createStartContract(),
  esConfig: {
    elasticsearch_host: 'https://your_deployment_url',
  },
  getChromeStyle$: jest.fn().mockReturnValue(of('classic')),
  getNavLinks: jest.fn().mockReturnValue([]),
  guidedOnboarding: {},
  history: mockHistory,
  indexMappingComponent: () => {
    return <></>;
  },
  isSidebarEnabled: true,
  lens: {
    EmbeddableComponent: jest.fn(),
    stateHelperApi: jest.fn().mockResolvedValue({
      formula: jest.fn(),
    }),
  } as unknown as LensPublicStart,
  ml: mlPluginMock.createStartContract(),
  navigateToUrl: jest.fn(),
  productFeatures: {
    hasConnectors: true,
    hasDefaultIngestPipeline: true,
    hasDocumentLevelSecurityEnabled: true,
    hasIncrementalSyncEnabled: true,
    hasNativeConnectors: true,
    hasWebCrawler: true,
  },
  renderHeaderActions: jest.fn(),
  security: securityMock.createStart(),
  setBreadcrumbs: jest.fn(),
  setChromeIsVisible: jest.fn(),
  setDocTitle: jest.fn(),
  share: sharePluginMock.createStartContract(),
  uiActions: uiActionsEnhancedPluginMock.createStartContract(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  updateSideNavDefinition: jest.fn(),
};

type LogicFile = LogicWrapper<any>;
const DEFAULT_VALUES = {
  httpLogicValues: {
    http: httpServiceMock.createSetupContract(),
  },
  kibanaLogicValues: mockKibanaProps,
};

interface PrepareOptions {
  mockValues: typeof DEFAULT_VALUES;
  noDefaultActions: boolean;
}

interface TestHelper {
  actionsToRun: Array<() => void>;
  appendCallback: (callback: () => void) => void;
  defaultActions: () => TestHelper['actionsToRun'];
  defaultMockValues: typeof DEFAULT_VALUES;
  mountLogic: (logicFile: LogicFile, props?: object) => void;
  prepare: (options?: PrepareOptions) => void;
  render: (children: JSX.Element) => ReturnType<typeof testingLibraryRender>;
}

export const TestHelper: TestHelper = {
  actionsToRun: [],
  appendCallback: (callback) => {
    TestHelper.actionsToRun.push(callback);
  },
  defaultActions: () => {
    return [
      () => {
        resetContext();
      },
      () => {
        mountHttpLogic(TestHelper.defaultMockValues.httpLogicValues);
        mountKibanaLogic(TestHelper.defaultMockValues.kibanaLogicValues);
      },
    ];
  },
  defaultMockValues: DEFAULT_VALUES,
  mountLogic: (logicFile, props?) => {
    TestHelper.actionsToRun.push(() => logicFile.call(logicFile, props || undefined));
  },
  prepare: (options?) => {
    TestHelper.defaultMockValues = { ...DEFAULT_VALUES, ...(options?.mockValues || {}) };
    if (!options || !options.noDefaultActions) {
      TestHelper.actionsToRun = TestHelper.defaultActions();
    }
  },
  render: (children) => {
    TestHelper.actionsToRun.forEach((action) => {
      action();
    });
    return testingLibraryRender(
      <I18nProvider>
        <Provider>{children}</Provider>
      </I18nProvider>
    );
  },
};
