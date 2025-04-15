/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
interface TestProviderProps {
  children: React.ReactNode;
}

/**
 * A provider that wraps the necessary context for testing components.
 */
export const TestProvider: React.FC<Partial<TestProviderProps>> = ({ children } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
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
