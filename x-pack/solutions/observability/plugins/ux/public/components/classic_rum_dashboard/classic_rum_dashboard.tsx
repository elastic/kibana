/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageSection } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { DashboardToolbar } from '../app/rum_dashboard/rum_home';
import { RumOverview } from '../app/rum_dashboard';
import type { PluginContextValue } from '../../context/plugin_context';
import { UxProviders } from '../../application/ux_providers';
import { createCallApmApi } from '../../services/rest/create_call_apm_api';
import type { ApmPluginStartDeps } from '../../plugin';
import type { ClassicRumDashboardProps } from './types';
import { useEmbeddedHistory } from './use_embedded_history';

/** Builds the dashboard inside the ux app's providers, on an in-memory URL and pinned to one service. */
export const createClassicRumDashboard = ({
  core,
  startDeps,
  isDev,
  spaceId,
}: {
  core: CoreStart;
  startDeps: ApmPluginStartDeps;
  isDev: boolean;
  spaceId: string;
}): React.ComponentType<ClassicRumDashboardProps> => {
  // The ux app does this on mount; the dashboard can render without the app ever being mounted.
  createCallApmApi(core);

  const services = { ...core, ...startDeps };
  const pluginContext: PluginContextValue = {
    exploratoryView: startDeps.exploratoryView,
    observabilityShared: startDeps.observabilityShared,
    spaceId,
    isDev,
  };

  function ClassicRumDashboard({
    serviceName,
    timeRange,
    onTimeRangeChange,
  }: ClassicRumDashboardProps) {
    // An in-memory URL keeps the dashboard state out of the host app's URL.
    const history = useEmbeddedHistory({ serviceName, timeRange, onTimeRangeChange });

    return (
      // React Router keeps its first history, so a new service remounts the providers.
      <UxProviders
        key={serviceName}
        core={core}
        services={services}
        pluginContext={pluginContext}
        history={history}
      >
        <EuiPageSection paddingSize="m" restrictWidth={false}>
          {/* The host pins the service, so the select that switches it is hidden. */}
          <DashboardToolbar showWebApplicationSelect={false} />
          <RumOverview />
        </EuiPageSection>
      </UxProviders>
    );
  }

  return ClassicRumDashboard;
};
