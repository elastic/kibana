/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { ElasticsearchHomePublicStart } from '@kbn/elasticsearch-home/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { WebCrawlerPublicStart } from '@kbn/web-crawler-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

export interface SearchHomepageAppPluginStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  cloud?: CloudStart;
  console?: ConsolePluginStart;
  elasticsearchHome: ElasticsearchHomePublicStart;
  usageCollection?: UsageCollectionStart;
  searchNavigation?: SearchNavigationPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  uiActions?: UiActionsStart;
  webCrawler?: WebCrawlerPublicStart;
}

export type SearchHomepageServicesContextDeps = SearchHomepageAppPluginStartDependencies & {
  history: AppMountParameters['history'];
  /** Hides or shows the Kibana header and navigation while this app is open. */
  setChromeHidden: (isHidden: boolean) => void;
  /** Tells the ingest gate what the cluster holds, so every other page follows without a reload. */
  reportHasData: (hasData: boolean) => void;
};

export type SearchHomepageServicesContext = CoreStart & SearchHomepageServicesContextDeps;
