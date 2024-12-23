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
import type { GroupSloCustomInput, SingleSloCustomInput } from './types';
import { SLOPublicPluginsStart } from '../../..';
import { SloConfiguration } from './slo_configuration';
import { SLORepositoryClient } from '../../../types';
import { PluginContext } from '../../../context/plugin_context';

export async function openSloConfiguration(
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient,
  initialState?: GroupSloCustomInput
): Promise<GroupSloCustomInput | SingleSloCustomInput> {
  const { overlays } = coreStart;

  const queryClient = new QueryClient();

  return new Promise(async (resolve, reject) => {
    try {
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
                <SloConfiguration
                  initialInput={initialState}
                  onCreate={(update: GroupSloCustomInput | SingleSloCustomInput) => {
                    flyoutSession.close();
                    resolve(update);
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
