/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ThemeProvider } from 'styled-components';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { CellActionsProvider } from '@kbn/cell-actions';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import {
  AssistantProvider,
  useAssistantContextValue,
} from '@kbn/elastic-assistant/impl/assistant_context';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { CASES_FEATURE_ID, SECURITY_FEATURE_ID } from '../../../common';
import { ReactQueryClientProvider } from '../containers/query_client/query_client_provider';
import { createStore } from '../store';
import { mockGlobalState } from './global_state';
import { createSecuritySolutionStorageMock, localStorageMock } from './mock_local_storage';
import { SUB_PLUGINS_REDUCER } from './utils';
import { UpsellingProvider } from '../components/upselling_provider';
import { useKibana } from '../lib/kibana';
import { licenseService } from '../hooks/use_license';

const uiSettings = {
  get: (setting: string) => {
    switch (setting) {
      case 'dateFormat':
        return 'MMM D, YYYY @ HH:mm:ss.SSS';
      case 'dateFormat:scaled':
        return [['', 'HH:mm:ss.SSS']];
    }
  },
  get$: () => new Subject(),
};

const noopLogger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  log: () => {},
  isLevelEnabled: () => false,
  get: (..._childContextPaths: string[]) => noopLogger,
};

const mockGraphResponse = {
  nodes: [
    {
      id: 'user-test-user-name',
      label: 'test-user-name',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
    },
    {
      id: 'host-test-host',
      label: 'test-host',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
    },
    {
      id: 'process-bash',
      label: '/bin/bash',
      color: 'warning',
      shape: 'rectangle',
      icon: 'console',
    },
  ],
  edges: [
    { id: 'edge-1', source: 'user-test-user-name', target: 'host-test-host', color: 'primary' },
    { id: 'edge-2', source: 'host-test-host', target: 'process-bash', color: 'subdued' },
  ],
};

const noopHttp = {
  basePath: { serverBasePath: '', prepend: (p: string) => p, get: () => '' },
  fetch: (path: string) => {
    if (typeof path === 'string' && path.includes('entity_store') && path.includes('status')) {
      return Promise.resolve({ status: 'running', engines: [] });
    }
    return Promise.resolve({});
  },
  post: (path: string) => {
    if (typeof path === 'string' && path.includes('cloud_security_posture/graph')) {
      return Promise.resolve(mockGraphResponse);
    }
    return Promise.resolve({});
  },
} as unknown as CoreStart['http'];

const coreMock = {
  application: {
    getUrlForApp: () => {},
    navigateToUrl: () => {},
    currentAppId$: new BehaviorSubject<string | undefined>(undefined),
    capabilities: {
      [CASES_FEATURE_ID]: {},
      [SECURITY_FEATURE_ID]: {
        crud: true,
        read: true,
        'entity-analytics': true,
        writeGlobalArtifacts: true,
        socManagement: true,
      },
    },
  },
  lens: {
    EmbeddableComponent: () => <span />,
  },
  cases: {
    helpers: {
      getUICapabilities: () => ({}),
    },
    hooks: {
      useCasesAddToExistingCaseModal: () => {},
      useCasesAddToNewCaseFlyout: () => {},
    },
  },
  data: {
    query: {
      filterManager: {},
    },
    search: {
      session: React.createRef(),
    },
    actions: {
      createFiltersFromValueClickAction: () => {},
    },
  },
  settings: {
    client: {
      get: () => {},
      get$: () => new Subject(),
      set: () => {},
    },
  },
  uiSettings,
  notifications: {
    toasts: {
      get$: () => new Subject(),
      add: () => ({ id: '' }),
      remove: () => {},
      addInfo: () => ({ id: '' }),
      addSuccess: () => ({ id: '' }),
      addWarning: () => ({ id: '' }),
      addDanger: () => ({ id: '' }),
      addError: () => ({ id: '' }),
    },
  },
  timelines: {
    getHoverActions: () => ({
      getAddToTimelineButton: () => {},
      getCopyButton: () => {},
      getFilterForValueButton: () => {},
      getFilterOutValueButton: () => {},
    }),
  },
  logger: noopLogger,
  http: noopHttp,
  dataViews: {
    get: () => Promise.resolve({}),
    getDefaultDataView: () => Promise.resolve(null),
    find: () => Promise.resolve([]),
  },
  triggersActionsUi: {
    actionTypeRegistry: {
      has: () => false,
      register: () => {},
      get: () => ({}),
      list: () => [],
    },
  },
  storage: new Storage(localStorageMock()),
  upselling: new UpsellingService(),
  productFeatureKeys$: new BehaviorSubject<Set<string> | null>(
    new Set([ProductFeatureSecurityKey.graphVisualization])
  ),
  getComponents$: () => of({}),
} as unknown as CoreStart;

// Bootstrap the singleton license service with a platinum license so
// license-gated features (e.g. graph visualization) render in Storybook.
licenseService.start(
  of({
    isAvailable: true,
    isActive: true,
    type: 'platinum',
    signature: '',
    hasAtLeast: (level: string) => ['basic', 'standard', 'gold', 'platinum'].includes(level),
    getUnavailableReason: () => undefined,
    getFeature: (_name: string) => ({ isAvailable: true, isEnabled: true }),
    toJSON: () => ({ signature: '' }),
    check: () => ({ state: 'valid' as const }),
  } as import('@kbn/licensing-types').ILicense)
);
const KibanaReactContext = createKibanaReactContext(coreMock);

const assistantAvailability = {
  hasSearchAILakeConfigurations: false,
  hasAssistantPrivilege: false,
  hasAgentBuilderPrivilege: false,
  hasConnectorsAllPrivilege: false,
  hasConnectorsReadPrivilege: false,
  hasUpdateAIAssistantAnonymization: false,
  hasManageGlobalKnowledgeBase: false,
  isAssistantEnabled: false,
  isAssistantVisible: false,
  isAssistantManagementEnabled: false,
};

const noopDocLinks = {
  links: {},
} as unknown as CoreStart['docLinks'];

const noopChrome = {
  getChromeStyle$: () => new Subject(),
} as unknown as CoreStart['chrome'];

const noopUserProfileService = {
  getCurrent: () => Promise.resolve({ uid: '', user: { username: '' } }),
} as unknown as CoreStart['userProfile'];

const noopProductDocBase = {
  installation: {
    getStatus: () => Promise.resolve({}),
    install: () => Promise.resolve(),
    uninstall: () => Promise.resolve(),
  },
};

const noopActionTypeRegistry = {
  has: () => false,
  register: () => {},
  get: () => ({}),
  list: () => [],
} as unknown as Parameters<typeof useAssistantContextValue>[0]['actionTypeRegistry'];

const noopSettings = {
  client: { get: () => undefined },
} as unknown as Parameters<typeof useAssistantContextValue>[0]['settings'];

/**
 * Inner component that calls the useAssistantContextValue hook (must be inside ReactQueryClientProvider).
 */
const StorybookAssistantProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const assistantContextValue = useAssistantContextValue({
    actionTypeRegistry: noopActionTypeRegistry,
    assistantAvailability,
    augmentMessageCodeBlocks: { mount: () => () => {} },
    basePath: '',
    docLinks: noopDocLinks,
    getComments: () => [],
    http: noopHttp,
    navigateToApp: () => Promise.resolve(),
    currentAppId: 'securitySolution',
    productDocBase: noopProductDocBase as unknown as Parameters<
      typeof useAssistantContextValue
    >[0]['productDocBase'],
    userProfileService: noopUserProfileService,
    chrome: noopChrome,
    getUrlForApp: () => '',
    settings: noopSettings,
  });

  return <AssistantProvider value={assistantContextValue}>{children}</AssistantProvider>;
};

/**
 * A utility for wrapping components in Storybook that provides access to the most common React contexts used by security components.
 * It is a simplified version of TestProvidersComponent.
 * To reuse TestProvidersComponent here, we need to remove all references to jest from mocks.
 */
const { storage } = createSecuritySolutionStorageMock();

const StorybookUpsellingProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const upsellingService = useKibana().services.upselling as UpsellingService;
  return <UpsellingProvider upsellingService={upsellingService}>{children}</UpsellingProvider>;
};

export const StorybookProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, coreMock, storage);

  return (
    <I18nProvider>
      <KibanaReactContext.Provider>
        <NavigationProvider core={coreMock}>
          <ReactQueryClientProvider>
            <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve([])}>
              <ReduxStoreProvider store={store}>
                <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
                  <StorybookUpsellingProvider>
                    <StorybookAssistantProvider>{children}</StorybookAssistantProvider>
                  </StorybookUpsellingProvider>
                </ThemeProvider>
              </ReduxStoreProvider>
            </CellActionsProvider>
          </ReactQueryClientProvider>
        </NavigationProvider>
      </KibanaReactContext.Provider>
    </I18nProvider>
  );
};
