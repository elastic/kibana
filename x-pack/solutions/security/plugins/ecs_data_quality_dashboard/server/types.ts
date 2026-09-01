/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

/** The plugin setup interface */
export interface EcsDataQualityDashboardPluginSetup {} // eslint-disable-line @typescript-eslint/no-empty-interface

/** The plugin start interface */
export interface EcsDataQualityDashboardPluginStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

export interface PluginSetupDependencies {
  spaces?: SpacesPluginSetup;
}

export type DataQualityDashboardRequestHandlerContext = CustomRequestHandlerContext<{
  dataQualityDashboard: {
    spaceId: string;
    getResultsIndexName: () => Promise<string>;
  };
}>;
