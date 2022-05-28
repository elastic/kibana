/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '../../../../test/functional/page_objects';

import { CanvasPageProvider } from './canvas_page';
import { SecurityPageObject } from './security_page';
import { MonitoringPageObject } from './monitoring_page';
import { LogstashPageObject } from './logstash_page';
import { GraphPageObject } from './graph_page';
import { GrokDebuggerPageObject } from './grok_debugger_page';
import { WatcherPageObject } from './watcher_page';
import { ReportingPageObject } from './reporting_page';
import { AccountSettingsPageObject } from './account_settings_page';
import { ObservabilityPageProvider } from './observability_page';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraLogsPageProvider } from './infra_logs_page';
import { GisPageObject } from './gis_page';
import { GeoFileUploadPageObject } from './geo_file_upload';
import { StatusPageObject } from './status_page';
import { UpgradeAssistantPageObject } from './upgrade_assistant_page';
import { RollupPageObject } from './rollup_page';
import { UptimePageObject } from './uptime_page';
import { ApiKeysPageProvider } from './api_keys_page';
import { LicenseManagementPageProvider } from './license_management_page';
import { IndexManagementPageProvider } from './index_management_page';
import { IndexLifecycleManagementPageProvider } from './index_lifecycle_management_page';
import { SnapshotRestorePageProvider } from './snapshot_restore_page';
import { CrossClusterReplicationPageProvider } from './cross_cluster_replication_page';
import { RemoteClustersPageProvider } from './remote_clusters_page';
import { CopySavedObjectsToSpacePageProvider } from './copy_saved_objects_to_space_page';
import { LensPageProvider } from './lens_page';
import { InfraMetricsExplorerProvider } from './infra_metrics_explorer';
import { InfraSavedViewsProvider } from './infra_saved_views';
import { RoleMappingsPageProvider } from './role_mappings_page';
import { SpaceSelectorPageObject } from './space_selector_page';
import { IngestPipelinesPageProvider } from './ingest_pipelines_page';
import { TagManagementPageObject } from './tag_management_page';
import { NavigationalSearchPageObject } from './navigational_search';
import { SearchSessionsPageProvider } from './search_sessions_management_page';
import { DetectionsPageObject } from '../../security_solution_ftr/page_objects/detections';
import { BannersPageObject } from './banners_page';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
  canvas: CanvasPageProvider,
  security: SecurityPageObject,
  accountSetting: AccountSettingsPageObject,
  monitoring: MonitoringPageObject,
  logstash: LogstashPageObject,
  graph: GraphPageObject,
  grokDebugger: GrokDebuggerPageObject,
  watcher: WatcherPageObject,
  reporting: ReportingPageObject,
  spaceSelector: SpaceSelectorPageObject,
  infraHome: InfraHomePageProvider,
  infraMetricsExplorer: InfraMetricsExplorerProvider,
  infraLogs: InfraLogsPageProvider,
  infraSavedViews: InfraSavedViewsProvider,
  maps: GisPageObject,
  geoFileUpload: GeoFileUploadPageObject,
  statusPage: StatusPageObject,
  upgradeAssistant: UpgradeAssistantPageObject,
  uptime: UptimePageObject,
  rollup: RollupPageObject,
  apiKeys: ApiKeysPageProvider,
  licenseManagement: LicenseManagementPageProvider,
  indexManagement: IndexManagementPageProvider,
  searchSessionsManagement: SearchSessionsPageProvider,
  indexLifecycleManagement: IndexLifecycleManagementPageProvider,
  tagManagement: TagManagementPageObject,
  snapshotRestore: SnapshotRestorePageProvider,
  crossClusterReplication: CrossClusterReplicationPageProvider,
  remoteClusters: RemoteClustersPageProvider,
  copySavedObjectsToSpace: CopySavedObjectsToSpacePageProvider,
  lens: LensPageProvider,
  roleMappings: RoleMappingsPageProvider,
  ingestPipelines: IngestPipelinesPageProvider,
  navigationalSearch: NavigationalSearchPageObject,
  banners: BannersPageObject,
  detections: DetectionsPageObject,
  observability: ObservabilityPageProvider,
};
