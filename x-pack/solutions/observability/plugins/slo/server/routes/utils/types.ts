/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../../types';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../lib/get_scoped_clients';
export type { RouteHandlerScopedClients };

export interface SLORoutesDependencies {
  plugins: {
    [key in keyof SLOPluginSetupDependencies]: {
      setup: Required<SLOPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof SLOPluginStartDependencies]: {
      start: () => Promise<Required<SLOPluginStartDependencies>[key]>;
    };
  };
  corePlugins: CoreSetup;
  getScopedClients: GetScopedClients;
  config: {
    isServerless: boolean;
    isCpsEnabled: boolean;
    compositeSloSummaryTaskEnabled: boolean;
  };
}

export type SLORouteHandlerResources = SLORoutesDependencies & DefaultRouteHandlerResources;
