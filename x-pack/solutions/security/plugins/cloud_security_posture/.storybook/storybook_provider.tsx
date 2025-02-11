/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import type { FC, PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import { Subject } from 'rxjs';
import { ThemeProvider } from '@emotion/react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { ReactQueryClientProvider } from '@kbn/security-solution-plugin/public/common/containers/query_client/query_client_provider';
import { CoreStart } from '@kbn/core/server';
import { ConfigContext, FleetStatusProvider } from '@kbn/fleet-plugin/public/hooks';
import { FleetConfigType } from '@kbn/fleet-plugin/common/types';

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

const coreMock = {
  cloud: {
    serverless: {},
    cloudId: 'fakeCloudId',
    onboarding: {},
  },
  licensing: {
    getLicense: () => {
      return {
        license: {
          uid: 'uid-000000001234',
          status: 'active',
          type: 'basic',
          mode: 'basic',
          expiryDateInMillis: 5000,
        },
        check: () => {
          return {
            state: 'valid',
          };
        },
      };
    },
  },
  application: {
    getUrlForApp: () => {},
    // capabilities: { [CASES_FEATURE_ID]: {} },
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
      addError: () => {},
      addSuccess: () => {},
      addWarning: () => {},
      remove: () => {},
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
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

interface StorybookProviders {
  // core: CoreStart;
  // deps: Partial<CspClientPluginStartDeps>;
  // params: AppMountParameters;
  children: React.ReactNode;
}

/**
 * A utility for wrapping components in Storybook that provides access to the most common React contexts used by security components.
 * It is a simplified version of TestProvidersComponent.
 * To reuse TestProvidersComponent here, we need to remove all references to jest from mocks.
 */
export const StorybookProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  //   const store = createMockStore();

  return (
    <I18nProvider>
      <KibanaReactContext.Provider>
        <ReactQueryClientProvider>
          <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
            {children}
          </ThemeProvider>
        </ReactQueryClientProvider>
      </KibanaReactContext.Provider>
    </I18nProvider>
  );
};

export const StorybookFleetProvider = ({ children }: { children: React.ReactNode }) => {
  const [forceDisplayInstructions, setForceDisplayInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(true);
  const [missingRequirements, setMissingRequirements] = useState([]);
  const [missingOptionalFeatures, setMissingOptionalFeatures] = useState([]);
  const [isSecretsStorageEnabled, setIsSecretsStorageEnabled] = useState(true);
  const [isSpaceAwarenessEnabled, setIsSpaceAwarenessEnabled] = useState(true);
  const [spaceId, setSpaceId] = useState<string | undefined>(undefined);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setIsReady(true);
    setMissingRequirements([]);
    setMissingOptionalFeatures([]);
    setIsSecretsStorageEnabled(true);
    setIsSpaceAwarenessEnabled(true);
    setSpaceId(undefined);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const state = {
    enabled: true,
    isLoading,
    isReady,
    missingRequirements,
    missingOptionalFeatures,
    isSecretsStorageEnabled,
    isSpaceAwarenessEnabled,
    spaceId,
  };

  const fleetConfig: FleetConfigType = {
    enabled: true,
    agents: {
      enabled: true,
      elasticsearch: {
        hosts: ['http://localhost:9200'],
      },
    },
  };

  return (
    <StorybookProviders>
      <ConfigContext.Provider value={fleetConfig}>
        <FleetStatusProvider
          defaultFleetStatus={{
            ...state,
            refetch,
            forceDisplayInstructions,
            setForceDisplayInstructions,
          }}
        >
          {children}
        </FleetStatusProvider>
      </ConfigContext.Provider>
    </StorybookProviders>
  );
};

StorybookFleetProvider.displayName = 'StorybookFleetProvider';
