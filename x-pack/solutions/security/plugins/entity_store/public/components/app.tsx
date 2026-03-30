/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ServicesContext } from '../services_context';
import { EntityStorePage } from './entity_store_page';
import type { AppServices } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const EntityStoreApp = (services: AppServices) => {
  return (
    <ServicesContext.Provider value={services}>
      <QueryClientProvider client={queryClient}>
        <EntityStorePage />
      </QueryClientProvider>
    </ServicesContext.Provider>
  );
};
