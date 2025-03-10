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
import { Subject } from 'rxjs';
import { ThemeProvider } from 'styled-components';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { CellActionsProvider } from '@kbn/cell-actions';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { CASES_FEATURE_ID } from '../../../common';
import { ReactQueryClientProvider } from '../containers/query_client/query_client_provider';
import { createMockStore } from './create_store';

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
  application: {
    getUrlForApp: () => {},
    capabilities: { [CASES_FEATURE_ID]: {} },
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

/**
 * A utility for wrapping components in Storybook that provides access to the most common React contexts used by security components.
 * It is a simplified version of TestProvidersComponent.
 * To reuse TestProvidersComponent here, we need to remove all references to jest from mocks.
 */
export const StorybookProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const store = createMockStore();

  return (
    <I18nProvider>
      <KibanaReactContext.Provider>
        <NavigationProvider core={coreMock}>
          <ReactQueryClientProvider>
            <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve([])}>
              <ReduxStoreProvider store={store}>
                <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
                  {children}
                </ThemeProvider>
              </ReduxStoreProvider>
            </CellActionsProvider>
          </ReactQueryClientProvider>
        </NavigationProvider>
      </KibanaReactContext.Provider>
    </I18nProvider>
  );
};
