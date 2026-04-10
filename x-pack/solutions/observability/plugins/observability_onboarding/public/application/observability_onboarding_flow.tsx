/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
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
  OtelApmPage,
  CloudForwarderPage,
  IngestHubPage,
  IntegrationDetailPage,
} from './pages';
import type { ObservabilityOnboardingAppServices } from '..';
import { useManagedOtlpServiceAvailability } from './shared/use_managed_otlp_service_availability';
import { CommentOverlay } from './comment_overlay/comment_overlay';

const queryClient = new QueryClient();

export function ObservabilityOnboardingFlow() {
  const { pathname } = useLocation();
  const {
    services: {
      context: { isDev, isCloud, isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  return (
    <QueryClientProvider client={queryClient}>
      <CommentOverlay />
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
        {isManagedOtlpServiceAvailable && (
          <Route path="/otel-apm">
            <OtelApmPage />
          </Route>
        )}
        {(isServerless || isDev) && (
          <Route path="/cloudforwarder">
            <CloudForwarderPage />
          </Route>
        )}
        <Route path="/ingest-hub/:section?">
          <IngestHubPage />
        </Route>
        <Route exact path="/">
          <LandingPage />
        </Route>
        <Route path="/add-data/:integration">
          <IntegrationDetailPage />
        </Route>
        <Route>
          <LandingPage />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
