/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ClientPluginsStart } from '../../../plugin';
import { MonitorConfiguration } from './monitor_configuration';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../constants';
import type { OverviewMonitorsEmbeddableCustomState } from '../monitors_overview/monitors_embeddable_factory';
import type { OverviewStatsEmbeddableCustomState } from '../../../../common/embeddables/stats_overview/types';
import type { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../../../../common/embeddables/stats_overview/constants';

interface CommonParams {
  title: string;
  coreStart: CoreStart;
  pluginStart: ClientPluginsStart;
}

type OverviewMonitorsInput = Required<OverviewMonitorsEmbeddableCustomState>;
type OverviewStatsInput = Required<OverviewStatsEmbeddableCustomState>;

// Function overloads to provide type safety without casting
export async function openMonitorConfiguration(
  params: CommonParams & {
    initialState?: OverviewMonitorsInput;
    type: typeof SYNTHETICS_MONITORS_EMBEDDABLE;
  }
): Promise<OverviewMonitorsInput>;
export async function openMonitorConfiguration(
  params: CommonParams & {
    initialState?: OverviewStatsInput;
    type: typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE;
  }
): Promise<OverviewStatsInput>;

// Implementation
export async function openMonitorConfiguration({
  coreStart,
  pluginStart,
  initialState,
  title,
  type,
}: CommonParams & {
  initialState?: OverviewMonitorsInput | OverviewStatsInput;
  type: typeof SYNTHETICS_MONITORS_EMBEDDABLE | typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE;
}): Promise<OverviewMonitorsInput | OverviewStatsInput> {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  return new Promise(async (resolve, reject) => {
    try {
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
                  resolve(update);
                }}
                onCancel={() => {
                  flyoutSession.close();
                  reject();
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
    } catch (error) {
      reject(error);
    }
  });
}
