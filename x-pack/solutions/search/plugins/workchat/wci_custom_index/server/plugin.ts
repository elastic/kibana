/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type {
  WCICustomIndexPluginStart,
  WCICustomIndexPluginSetup,
  WCICustomIndexPluginSetupDependencies,
  WCICustomIndexPluginStartDependencies
} from './types';
import { getMcpServer } from './mcp_server';
import { IntegrationTypes } from '@kbn/wci-common';

export class WCICustomIndexPlugin
  implements
    Plugin<
      WCICustomIndexPluginSetup,
      WCICustomIndexPluginStart,
      WCICustomIndexPluginSetupDependencies,
      WCICustomIndexPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, pluginsDependencies: WCICustomIndexPluginSetupDependencies) {
    return {};
  }

  public start(core: CoreStart, pluginsDependencies: WCICustomIndexPluginStartDependencies) {
    return {
      integration: {
        mcpServer: getMcpServer,
        name: IntegrationTypes.CustomIndex
      }
    };
  }
} 