/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginSetup, ConsolePluginStart } from '@kbn/console-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ElasticsearchHomePublicStart } from '@kbn/elasticsearch-home/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessVectordbPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessVectordbPluginStart {}

export interface ServerlessVectordbSetupDependencies {
  console?: ConsolePluginSetup;
}

export interface ServerlessVectordbAppStartDependencies {
  share: SharePluginStart;
  console?: ConsolePluginStart;
  cloud?: CloudStart;
  elasticsearchHome: ElasticsearchHomePublicStart;
}

export interface ServerlessVectordbStartDependencies
  extends ServerlessVectordbAppStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export type ServerlessVectordbServices = CoreStart &
  ServerlessVectordbAppStartDependencies & {
    history: AppMountParameters['history'];
  };
