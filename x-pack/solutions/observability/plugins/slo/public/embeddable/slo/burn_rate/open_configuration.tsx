/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import type { SLOPublicPluginsStart } from '../../..';
import { PluginContext } from '../../../context/plugin_context';
import type { SLORepositoryClient } from '../../../types';
import { Configuration } from './configuration';
import type { EmbeddableProps, SloBurnRateEmbeddableState } from './types';

export async function openConfiguration(
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient,
  initialState?: SloBurnRateEmbeddableState
): Promise<SloBurnRateEmbeddableState> {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  return new Promise(async (resolve, reject) => {
    try {
      // Convert initialState from snake_case to camelCase for the Configuration component
      const initialProps: EmbeddableProps | undefined = initialState
        ? {
            sloId: initialState.slo_id,
            sloInstanceId: initialState.slo_instance_id ?? '',
            duration: initialState.duration,
          }
        : undefined;

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              ...coreStart,
              ...pluginsStart,
            }}
          >
            <PluginContext.Provider
              value={{
                observabilityRuleTypeRegistry:
                  pluginsStart.observability.observabilityRuleTypeRegistry,
                ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
                sloClient,
              }}
            >
              <QueryClientProvider client={queryClient}>
                <Configuration
                  initialInput={initialProps}
                  onCreate={(update: EmbeddableProps) => {
                    flyoutSession.close();
                    // Convert camelCase to snake_case for embeddable state
                    resolve({
                      slo_id: update.sloId,
                      slo_instance_id: update.sloInstanceId,
                      duration: update.duration,
                    });
                  }}
                  onCancel={() => {
                    flyoutSession.close();
                    reject();
                  }}
                />
              </QueryClientProvider>
            </PluginContext.Provider>
          </KibanaContextProvider>,
          coreStart
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
