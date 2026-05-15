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
} from './pages';
import {
  HostLinuxAutoDetectPage,
  HostLinuxOtelPage,
  HostMacosAutoDetectPage,
  HostMacosOtelPage,
  HostWindowsOtelPage,
} from './pages/host';
import type { ObservabilityOnboardingAppServices } from '..';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../common/feature_flags';
import { useFlowBreadcrumb } from './shared/use_flow_breadcrumbs';
import { useManagedOtlpServiceAvailability } from './shared/use_managed_otlp_service_availability';

const queryClient = new QueryClient();

export function ObservabilityOnboardingFlow() {
  const { pathname } = useLocation();
  const {
    services: {
      featureFlags,
      context: { isDev, isCloud, isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const isAddDataPageV2Enabled = featureFlags.getBooleanValue(IS_ADD_DATA_PAGE_V2_ENABLED, false);

  useFlowBreadcrumb(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  // V2 host onboarding sub-pages. Returned as an array (not a fragment) so the
  // legacy Switch underlying Routes still iterates each Route as a direct child.
  // When the FF is off, no /host/* routes are registered and the catch-all
  // LandingPage at the bottom of the Routes renders on the original path
  // (e.g. /host/linux stays as /host/linux), per the V2 spec.
  const v2HostRoutes = isAddDataPageV2Enabled
    ? [
        <Route key="host-linux" exact path="/host/linux">
          <HostLinuxOtelPage />
        </Route>,
        <Route key="host-linux-auto-detect" exact path="/host/linux/auto-detect">
          <HostLinuxAutoDetectPage />
        </Route>,
        <Route key="host-macos" exact path="/host/macos">
          <HostMacosOtelPage />
        </Route>,
        <Route key="host-macos-auto-detect" exact path="/host/macos/auto-detect">
          <HostMacosAutoDetectPage />
        </Route>,
        <Route key="host-windows" exact path="/host/windows">
          <HostWindowsOtelPage />
        </Route>,
      ]
    : [];

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
        {v2HostRoutes}
        <Route>
          <LandingPage />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
