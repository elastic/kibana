/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense, lazy } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { SLOPublicPluginsStart } from '../../..';
import { PluginContext } from '../../../context/plugin_context';
import { SLORepositoryClient } from '../../../types';
import type { EmbeddableSloProps } from './types';

export async function openSloConfiguration(
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient,
  initialState?: EmbeddableSloProps
): Promise<EmbeddableSloProps> {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  return new Promise(async (resolve, reject) => {
    try {
      const LazySloConfiguration = lazy(async () => {
        const { SloConfiguration } = await import('./slo_configuration');
        return {
          default: SloConfiguration,
        };
      });
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
                <Suspense fallback={<EuiSkeletonText />}>
                  <LazySloConfiguration
                    initialInput={initialState}
                    onCreate={(update: EmbeddableSloProps) => {
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
