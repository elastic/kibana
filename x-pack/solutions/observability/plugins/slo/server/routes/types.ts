/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, CustomRequestHandlerContext } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../types';

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
}

export type SLORouteHandlerResources = SLORoutesDependencies &
  DefaultRouteHandlerResources & {
    context: SLORequestHandlerContext;
  };

export interface SLORouteContext {
  isServerless: boolean;
}

export type SLORequestHandlerContext = CustomRequestHandlerContext<{
  slo: Promise<SLORouteContext>;
}>;
