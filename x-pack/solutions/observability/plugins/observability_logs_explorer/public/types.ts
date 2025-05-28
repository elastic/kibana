/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DiscoverStart } from '@kbn/discover-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerSetupDeps {}

export interface ObservabilityLogsExplorerStartDeps {
  discover: DiscoverStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerStartServices {}
