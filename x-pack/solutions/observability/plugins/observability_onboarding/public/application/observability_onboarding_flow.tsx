/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom-v5-compat';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AutoDetectPage,
  KubernetesPage,
  LandingPage,
  OtelLogsPage,
  OtelKubernetesPage,
  FirehosePage,
} from './pages';
import { ObservabilityOnboardingAppServices } from '..';
import { useFlowBreadcrumb } from './shared/use_flow_breadcrumbs';

const queryClient = new QueryClient();

export function ObservabilityOnboardingFlow() {
  const { pathname } = useLocation();
  const {
    services: {
      context: { isDev, isCloud },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useFlowBreadcrumb(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/auto-detect">
          <AutoDetectPage />
        </Route>
        <Route path="/kubernetes">
          <KubernetesPage />
        </Route>
        <Route path="/otel-kubernetes">
          <OtelKubernetesPage />
        </Route>
        <Route path="/otel-logs">
          <OtelLogsPage />
        </Route>
        {(isCloud || isDev) && (
          <Route path="/firehose">
            <FirehosePage />
          </Route>
        )}
        <Route>
          <LandingPage />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
