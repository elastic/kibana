/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KubernetesSecurityDeps } from '../types';

// Initializing react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

const KubernetesSecurityLazy = lazy(() => import('../components/kubernetes_security_routes'));

export const getKubernetesSecurityLazy = (props: KubernetesSecurityDeps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <KubernetesSecurityLazy {...props} />
      </Suspense>
    </QueryClientProvider>
  );
};
