/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { ApplicationStart, Capabilities } from '@kbn/core/public';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';

import { mockHistory } from '../react_router/state.mock';

export const mockKibanaValues = {
  application: {
    getUrlForApp: jest.fn(
      (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`
    ),
  } as unknown as ApplicationStart,
  capabilities: {} as Capabilities,
  charts: chartPluginMock.createStartContract(),
  cloud: {
    ...cloudMock.createSetup(),
    deployment_url: 'https://cloud.elastic.co/deployments/some-id',
    isCloudEnabled: false,
  },
  config: { host: 'http://localhost:3002' },
  connectorTypes: [],
  consolePlugin: null,
  data: dataPluginMock.createStartContract(),
  esConfig: { elasticsearch_host: 'https://your_deployment_url' },
  fleet: {
    config: {
      agentless: true,
    },
  },
  getChromeStyle$: jest.fn().mockReturnValue(of('classic')),
  getNavLinks: jest.fn().mockReturnValue([]),
  guidedOnboarding: {},
  history: mockHistory,
  indexMappingComponent: null,
  isAgentlessEnabled: false,
  isCloud: false,
  isServerless: false,
  isSidebarEnabled: true,
  kibanaVersion: null,
  lens: {
    EmbeddableComponent: jest.fn(),
    stateHelperApi: jest.fn().mockResolvedValue({
      formula: jest.fn(),
    }),
  } as unknown as LensPublicStart,
  ml: mlPluginMock.createStartContract(),
  navigateToUrl: jest.fn(),
  productFeatures: {
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
  user: null,
};

jest.mock('../../shared/kibana', () => ({
  KibanaLogic: { values: mockKibanaValues },
}));
