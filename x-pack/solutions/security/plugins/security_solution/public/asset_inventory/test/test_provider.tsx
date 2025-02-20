/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from '@kbn/core/public';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
// eslint-disable-next-line no-restricted-imports
import { Router } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coreMock } from '@kbn/core/public/mocks';

interface TestProviderProps {
  params: AppMountParameters;
  children: React.ReactNode;
}

/**
 * A provider that wraps the necessary context for testing components.
 */
export const TestProvider: React.FC<Partial<TestProviderProps>> = ({
  params = coreMock.createAppMountParameters(),
  children,
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router history={params.history}>
        <I18nProvider>
          <Routes>
            <Route path="*" render={() => <>{children}</>} />
          </Routes>
        </I18nProvider>
      </Router>
    </QueryClientProvider>
  );
};
