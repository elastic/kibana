/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessVectordbPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessVectordbPluginStart {}

export interface ServerlessVectordbAppStartDependencies {
  share: SharePluginStart;
  console?: ConsolePluginStart;
  cloud?: CloudStart;
  agentBuilder?: AgentBuilderPluginStart;
}

export interface ServerlessVectordbStartDependencies
  extends ServerlessVectordbAppStartDependencies {
  serverless: ServerlessPluginStart;
}

export type ServerlessVectordbServices = CoreStart &
  ServerlessVectordbAppStartDependencies & {
    history: AppMountParameters['history'];
  };
