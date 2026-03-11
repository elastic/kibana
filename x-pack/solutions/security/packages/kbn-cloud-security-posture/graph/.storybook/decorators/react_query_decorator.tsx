/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

export const ReactQueryStorybookDecorator = (Story: ComponentType) => {
  const mockQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={mockQueryClient}>
      <Story />
    </QueryClientProvider>
  );
};
