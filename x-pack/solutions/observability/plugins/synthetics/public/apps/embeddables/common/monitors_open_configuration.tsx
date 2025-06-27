/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../plugin';
import { SYNTHETICS_MONITORS_EMBEDDABLE, SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../constants';
import { OverviewMonitorsEmbeddableCustomState } from '../monitors_overview/monitors_embeddable_factory';
import { OverviewStatsEmbeddableCustomState } from '../stats_overview/stats_overview_embeddable_factory';
import { MonitorConfiguration } from './monitor_configuration';

interface CommonParams {
  title: string;
  coreStart: CoreStart;
  pluginStart: ClientPluginsStart;
}

type OverviewMonitorsInput = Required<OverviewMonitorsEmbeddableCustomState>;
type OverviewStatsInput = Required<OverviewStatsEmbeddableCustomState>;

// Implementation
export async function openMonitorConfiguration({
  coreStart,
  pluginStart,
  initialState,
  title,
  type,
  onConfirm,
}: CommonParams & {
  initialState?: OverviewMonitorsInput | OverviewStatsInput;
  type: typeof SYNTHETICS_MONITORS_EMBEDDABLE | typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE;
  onConfirm?: (state: OverviewMonitorsInput | OverviewStatsInput) => void;
}) {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <KibanaContextProvider
        services={{
          ...coreStart,
          ...pluginStart,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MonitorConfiguration
            title={title}
            initialInput={initialState}
            onCreate={(update) => {
              flyoutSession.close();
              onConfirm?.(update);
            }}
            onCancel={() => {
              flyoutSession.close();
            }}
          >
            {type === SYNTHETICS_MONITORS_EMBEDDABLE ? (
              <MonitorConfiguration.ViewSwitch />
            ) : null}
          </MonitorConfiguration>
        </QueryClientProvider>
      </KibanaContextProvider>,
      coreStart
    )
  );
}
