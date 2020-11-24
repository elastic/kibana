/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '../../../../test/functional/page_objects';

import { CanvasPageProvider } from './canvas_page';
import { SecurityPageProvider } from './security_page';
import { MonitoringPageProvider } from './monitoring_page';
// @ts-ignore not ts yet
import { LogstashPageProvider } from './logstash_page';
import { GraphPageProvider } from './graph_page';
import { GrokDebuggerPageProvider } from './grok_debugger_page';
import { WatcherPageProvider } from './watcher_page';
import { ReportingPageProvider } from './reporting_page';
import { AccountSettingProvider } from './account_settings_page';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraLogsPageProvider } from './infra_logs_page';
import { GisPageProvider } from './gis_page';
import { StatusPagePageProvider } from './status_page';
import { UpgradeAssistantPageProvider } from './upgrade_assistant_page';
import { RollupPageProvider } from './rollup_page';
import { UptimePageProvider } from './uptime_page';
import { ApiKeysPageProvider } from './api_keys_page';
import { LicenseManagementPageProvider } from './license_management_page';
import { IndexManagementPageProvider } from './index_management_page';
import { IndexLifecycleManagementPageProvider } from './index_lifecycle_management_page';
import { SnapshotRestorePageProvider } from './snapshot_restore_page';
import { CrossClusterReplicationPageProvider } from './cross_cluster_replication_page';
import { RemoteClustersPageProvider } from './remote_clusters_page';
import { CopySavedObjectsToSpacePageProvider } from './copy_saved_objects_to_space_page';
import { LensPageProvider } from './lens_page';
import { InfraMetricExplorerProvider } from './infra_metric_explorer';
import { RoleMappingsPageProvider } from './role_mappings_page';
import { SpaceSelectorPageProvider } from './space_selector_page';
import { IngestPipelinesPageProvider } from './ingest_pipelines_page';
import { TagManagementPageProvider } from './tag_management_page';
import { NavigationalSearchProvider } from './navigational_search';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
  canvas: CanvasPageProvider,
  security: SecurityPageProvider,
  accountSetting: AccountSettingProvider,
  monitoring: MonitoringPageProvider,
  logstash: LogstashPageProvider,
  graph: GraphPageProvider,
  grokDebugger: GrokDebuggerPageProvider,
  watcher: WatcherPageProvider,
  reporting: ReportingPageProvider,
  spaceSelector: SpaceSelectorPageProvider,
  infraHome: InfraHomePageProvider,
  infraMetricExplorer: InfraMetricExplorerProvider,
  infraLogs: InfraLogsPageProvider,
  maps: GisPageProvider,
  statusPage: StatusPagePageProvider,
  upgradeAssistant: UpgradeAssistantPageProvider,
  uptime: UptimePageProvider,
  rollup: RollupPageProvider,
  apiKeys: ApiKeysPageProvider,
  licenseManagement: LicenseManagementPageProvider,
  indexManagement: IndexManagementPageProvider,
  indexLifecycleManagement: IndexLifecycleManagementPageProvider,
  tagManagement: TagManagementPageProvider,
  snapshotRestore: SnapshotRestorePageProvider,
  crossClusterReplication: CrossClusterReplicationPageProvider,
  remoteClusters: RemoteClustersPageProvider,
  copySavedObjectsToSpace: CopySavedObjectsToSpacePageProvider,
  lens: LensPageProvider,
  roleMappings: RoleMappingsPageProvider,
  ingestPipelines: IngestPipelinesPageProvider,
  navigationalSearch: NavigationalSearchProvider,
};
