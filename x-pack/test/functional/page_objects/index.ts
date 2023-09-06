/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '../../../../test/functional/page_objects';

import { AccountSettingsPageObject } from './account_settings_page';
import { ApiKeysPageProvider } from './api_keys_page';
import { AssetDetailsProvider } from './asset_details';
import { BannersPageObject } from './banners_page';
import { CanvasPageProvider } from './canvas_page';
import { CopySavedObjectsToSpacePageProvider } from './copy_saved_objects_to_space_page';
import { CrossClusterReplicationPageProvider } from './cross_cluster_replication_page';
import { DetectionsPageObject } from '../../security_solution_ftr/page_objects/detections';
import { GeoFileUploadPageObject } from './geo_file_upload';
import { GisPageObject } from './gis_page';
import { GraphPageObject } from './graph_page';
import { GrokDebuggerPageObject } from './grok_debugger_page';
import { IndexLifecycleManagementPageProvider } from './index_lifecycle_management_page';
import { IndexManagementPageProvider } from './index_management_page';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraHostsViewProvider } from './infra_hosts_view';
import { InfraLogsPageProvider } from './infra_logs_page';
import { InfraMetricsExplorerProvider } from './infra_metrics_explorer';
import { InfraSavedViewsProvider } from './infra_saved_views';
import { IngestPipelinesPageProvider } from './ingest_pipelines_page';
import { LensPageProvider } from './lens_page';
import { LicenseManagementPageProvider } from './license_management_page';
import { LogstashPageObject } from './logstash_page';
import { MaintenanceWindowsPageProvider } from './maintenance_windows_page';
import { MonitoringPageObject } from './monitoring_page';
import { NavigationalSearchPageObject } from './navigational_search';
import { ObservabilityLogExplorerPageObject } from './observability_log_explorer';
import { ObservabilityPageProvider } from './observability_page';
import { RemoteClustersPageProvider } from './remote_clusters_page';
import { ReportingPageObject } from './reporting_page';
import { RoleMappingsPageProvider } from './role_mappings_page';
import { RollupPageObject } from './rollup_page';
import { SearchSessionsPageProvider } from './search_sessions_management_page';
import { SecurityPageObject } from './security_page';
import { ShareSavedObjectsToSpacePageProvider } from './share_saved_objects_to_space_page';
import { SnapshotRestorePageProvider } from './snapshot_restore_page';
import { SpaceSelectorPageObject } from './space_selector_page';
import { StatusPageObject } from './status_page';
import { TagManagementPageObject } from './tag_management_page';
import { UpgradeAssistantPageObject } from './upgrade_assistant_page';
import { UptimePageObject } from './uptime_page';
import { WatcherPageObject } from './watcher_page';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
  accountSetting: AccountSettingsPageObject,
  apiKeys: ApiKeysPageProvider,
  assetDetails: AssetDetailsProvider,
  banners: BannersPageObject,
  canvas: CanvasPageProvider,
  copySavedObjectsToSpace: CopySavedObjectsToSpacePageProvider,
  crossClusterReplication: CrossClusterReplicationPageProvider,
  detections: DetectionsPageObject,
  geoFileUpload: GeoFileUploadPageObject,
  graph: GraphPageObject,
  grokDebugger: GrokDebuggerPageObject,
  indexLifecycleManagement: IndexLifecycleManagementPageProvider,
  indexManagement: IndexManagementPageProvider,
  infraHome: InfraHomePageProvider,
  infraHostsView: InfraHostsViewProvider,
  infraLogs: InfraLogsPageProvider,
  infraMetricsExplorer: InfraMetricsExplorerProvider,
  infraSavedViews: InfraSavedViewsProvider,
  ingestPipelines: IngestPipelinesPageProvider,
  lens: LensPageProvider,
  licenseManagement: LicenseManagementPageProvider,
  logstash: LogstashPageObject,
  maintenanceWindows: MaintenanceWindowsPageProvider,
  maps: GisPageObject,
  monitoring: MonitoringPageObject,
  navigationalSearch: NavigationalSearchPageObject,
  observabilityLogExplorer: ObservabilityLogExplorerPageObject,
  observability: ObservabilityPageProvider,
  remoteClusters: RemoteClustersPageProvider,
  reporting: ReportingPageObject,
  roleMappings: RoleMappingsPageProvider,
  rollup: RollupPageObject,
  searchSessionsManagement: SearchSessionsPageProvider,
  security: SecurityPageObject,
  shareSavedObjectsToSpace: ShareSavedObjectsToSpacePageProvider,
  snapshotRestore: SnapshotRestorePageProvider,
  spaceSelector: SpaceSelectorPageObject,
  statusPage: StatusPageObject,
  tagManagement: TagManagementPageObject,
  upgradeAssistant: UpgradeAssistantPageObject,
  uptime: UptimePageObject,
  watcher: WatcherPageObject,
};
