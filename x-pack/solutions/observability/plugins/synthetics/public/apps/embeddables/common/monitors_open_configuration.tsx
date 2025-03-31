/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiSkeletonText } from '@elastic/eui';
import { MonitorFilters } from '../monitors_overview/types';
import { ClientPluginsStart } from '../../../plugin';

export async function openMonitorConfiguration({
  coreStart,
  pluginStart,
  initialState,
  title,
}: {
  title: string;
  coreStart: CoreStart;
  pluginStart: ClientPluginsStart;
  initialState?: { filters: MonitorFilters };
}): Promise<{ filters: MonitorFilters }> {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  return new Promise(async (resolve, reject) => {
    try {
      const LazyMonitorConfiguration = lazy(async () => {
        const { MonitorConfiguration } = await import('./monitor_configuration');
        return {
          default: MonitorConfiguration,
        };
      });
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              ...coreStart,
              ...pluginStart,
            }}
          >
            <QueryClientProvider client={queryClient}>
              <Suspense fallback={<EuiSkeletonText />}>
                <LazyMonitorConfiguration
                  title={title}
                  initialInput={initialState}
                  onCreate={(update: { filters: MonitorFilters }) => {
                    flyoutSession.close();
                    resolve(update);
                  }}
                  onCancel={() => {
                    flyoutSession.close();
                    reject();
                  }}
                />
              </Suspense>
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
