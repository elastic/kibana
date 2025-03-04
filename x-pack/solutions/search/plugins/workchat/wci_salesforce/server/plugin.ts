/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type {
  WCISalesforcePluginStart,
  WCISalesforcePluginSetup,
  WCISalesforcePluginSetupDependencies,
  WCISalesforcePluginStartDependencies
} from './types';
import { getMcpServer } from './mcp_server';
import { IntegrationTypes } from '@kbn/wci-common';

export class WCISalesforcePlugin
  implements
    Plugin<
      WCISalesforcePluginSetup,
      WCISalesforcePluginStart,
      WCISalesforcePluginSetupDependencies,
      WCISalesforcePluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, pluginsDependencies: WCISalesforcePluginSetupDependencies) {
    return {};
  }

  public start(core: CoreStart, pluginsDependencies: WCISalesforcePluginStartDependencies) {
    return {
      integration: {
        mcpServer: getMcpServer,
        name: IntegrationTypes.Salesforce
      }
    };
  }
}
