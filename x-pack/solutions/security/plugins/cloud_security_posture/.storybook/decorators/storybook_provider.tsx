/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { Subject } from 'rxjs';
import { ThemeProvider } from '@emotion/react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { ReactQueryClientProvider } from '@kbn/security-solution-plugin/public/common/containers/query_client/query_client_provider';
import { CoreStart } from '@kbn/core/server';

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

// ts-expect-error
const KibanaReactContext = createKibanaReactContext(coreMock);

interface StorybookProvider {
  children: React.ReactNode;
}

/**
 * A utility for wrapping components in Storybook that provides access to the most common React contexts used by security components.
 * It is a simplified version of TestProvidersComponent.
 * To reuse TestProvidersComponent here, we need to remove all references to jest from mocks.
 */
export const StorybookProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
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
