/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { euiDarkVars } from '@kbn/ui-theme';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { MemoryRouter } from 'react-router-dom';
import { MockDiscoverInTimelineContext } from '../../../../../../../common/components/discover_in_timeline/mocks/discover_in_timeline_provider';
import { createKibanaContextProviderMock } from '../../../../../../../common/lib/kibana/kibana_react.mock';
import { createMockStore } from '../../../../../../../common/mock';
import { RouterSpyStateContext } from '../../../../../../../common/utils/route/helpers';
import { AllRulesTabs } from '../../../../../components/rules_table/rules_table_toolbar';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { MlCapabilitiesProvider } from '../../../../../../../common/components/ml/permissions/ml_capabilities_provider';
import { UpsellingProvider } from '../../../../../../../common/components/upselling_provider';

const MockKibanaContextProvider = createKibanaContextProviderMock();

function UpsellingProviderMock({ children }: React.PropsWithChildren<{}>): JSX.Element {
  return (
    <UpsellingProvider upsellingService={useKibana().services.upselling}>
      {children}
    </UpsellingProvider>
  );
}

/**
 * Defining custom Test Providers for Rule Upgrade Flyout required to avoid
 * impact on existing tests. Existing TestProviders doesn't provide necessary
 * contexts for the Rule Upgrade Flyout like `MlCapabilitiesProvider`. Mocking the
 * latter in TestProviders requires to refactor multiple Jest tests due to
 * `useKibana()` custom mocks also used in `MlCapabilitiesProvider`.
 */
export function RuleUpgradeTestProviders({ children }: PropsWithChildren<{}>): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: () => {},
    },
  });
  const store = createMockStore();

  return (
    <KibanaErrorBoundaryProvider analytics={undefined}>
      <RouterSpyStateContext.Provider
        value={[
          {
            pageName: SecurityPageName.rules,
            detailName: undefined,
            tabName: AllRulesTabs.updates,
            search: '',
            pathName: '/',
            state: undefined,
          },
          jest.fn(),
        ]}
      >
        <MemoryRouter>
          <MockKibanaContextProvider>
            <MlCapabilitiesProvider>
              <I18nProvider>
                <UpsellingProviderMock>
                  <ReduxStoreProvider store={store}>
                    <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
                      <QueryClientProvider client={queryClient}>
                        <MockDiscoverInTimelineContext>
                          <EuiProvider>{children}</EuiProvider>
                        </MockDiscoverInTimelineContext>
                      </QueryClientProvider>
                    </ThemeProvider>
                  </ReduxStoreProvider>
                </UpsellingProviderMock>
              </I18nProvider>
            </MlCapabilitiesProvider>
          </MockKibanaContextProvider>
        </MemoryRouter>
      </RouterSpyStateContext.Provider>
    </KibanaErrorBoundaryProvider>
  );
}
