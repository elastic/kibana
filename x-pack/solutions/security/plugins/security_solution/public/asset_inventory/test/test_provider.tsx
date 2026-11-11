/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { render } from '@testing-library/react';

interface TestProviderProps {
  children: React.ReactNode;
}

/**
 * A provider that wraps the necessary context for testing components.
 * Includes the Kibana, navigation, and chrome context the shared page header reads.
 */
export const TestProvider: React.FC<Partial<TestProviderProps>> = ({ children } = {}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
  );
  const [coreStart] = useState(() => coreMock.createStart());

  return (
    <MemoryRouter>
      <KibanaContextProvider services={coreStart}>
        <NavigationProvider core={coreStart}>
          <MockAppHeaderProvider>
            <QueryClientProvider client={queryClient}>
              <I18nProvider>{children}</I18nProvider>
            </QueryClientProvider>
          </MockAppHeaderProvider>
        </NavigationProvider>
      </KibanaContextProvider>
    </MemoryRouter>
  );
};

export const createTestProviderWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestProvider>{children}</TestProvider>;
  };
};

export const renderWithTestProvider = (children: React.ReactNode) => {
  return render(<TestProvider>{children}</TestProvider>);
};
