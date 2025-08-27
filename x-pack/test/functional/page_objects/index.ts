/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '@kbn/test-suites-src/functional/page_objects';

import { MonitoringPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/monitoring_page';
import { SecurityPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/security_page';
import { CopySavedObjectsToSpacePageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/copy_saved_objects_to_space_page';
import { SpaceSelectorPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/space_selector_page';
import { RoleMappingsPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/role_mappings_page';
import { ReportingPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/reporting_page';
import { WatcherPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/watcher_page';
import { SearchProfilerPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/search_profiler_page';
import { CanvasPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/canvas_page';
import { GisPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/gis_page';
import { LensPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/lens_page';
import { UpgradeAssistantFlyoutObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/upgrade_assistant_page';
import { SnapshotRestorePageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/snapshot_restore_page';
import { UserProfilePageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/user_profile_page';
import { SearchSessionsPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/search_sessions_management_page';
import { GraphPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/graph_page';
import { MaintenanceWindowsPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/maintenance_windows_page';
import { BannersPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/banners_page';
import { NavigationalSearchPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/navigational_search';
import { TagManagementPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/tag_management_page';
import { CrossClusterReplicationPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/cross_cluster_replication_page';
import { GrokDebuggerPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/grok_debugger_page';
import { LicenseManagementPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/license_management_page';
import { ApiKeysPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/api_keys_page';
import { IndexManagementPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/index_management_page';
import { IngestPipelinesPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/ingest_pipelines_page';
import { IndexLifecycleManagementPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/index_lifecycle_management_page';
import { LogstashPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/logstash_page';
import { RollupPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/rollup_page';
import { RemoteClustersPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/remote_clusters_page';
import { AssetDetailsProvider } from './asset_details';
import { EmbeddedConsoleProvider } from './embedded_console';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraHostsViewProvider } from './infra_hosts_view';
import { InfraLogsPageProvider } from './infra_logs_page';
import { ObservabilityLogsExplorerPageObject } from './observability_logs_explorer';
import { DatasetQualityPageObject } from './dataset_quality';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
  apiKeys: ApiKeysPageProvider,
  assetDetails: AssetDetailsProvider,
  banners: BannersPageObject,
  canvas: CanvasPageProvider,
  copySavedObjectsToSpace: CopySavedObjectsToSpacePageProvider,
  crossClusterReplication: CrossClusterReplicationPageProvider,
  embeddedConsole: EmbeddedConsoleProvider,
  graph: GraphPageObject,
  grokDebugger: GrokDebuggerPageObject,
  indexLifecycleManagement: IndexLifecycleManagementPageProvider,
  indexManagement: IndexManagementPageProvider,
  infraHome: InfraHomePageProvider,
  infraHostsView: InfraHostsViewProvider,
  infraLogs: InfraLogsPageProvider,
  ingestPipelines: IngestPipelinesPageProvider,
  lens: LensPageProvider,
  licenseManagement: LicenseManagementPageProvider,
  logstash: LogstashPageObject,
  maintenanceWindows: MaintenanceWindowsPageProvider,
  maps: GisPageObject,
  monitoring: MonitoringPageObject,
  navigationalSearch: NavigationalSearchPageObject,
  observabilityLogsExplorer: ObservabilityLogsExplorerPageObject,
  datasetQuality: DatasetQualityPageObject,
  remoteClusters: RemoteClustersPageProvider,
  reporting: ReportingPageObject,
  roleMappings: RoleMappingsPageProvider,
  rollup: RollupPageObject,
  searchProfiler: SearchProfilerPageProvider,
  searchSessionsManagement: SearchSessionsPageProvider,
  security: SecurityPageObject,
  snapshotRestore: SnapshotRestorePageProvider,
  spaceSelector: SpaceSelectorPageObject,
  tagManagement: TagManagementPageObject,
  upgradeAssistant: UpgradeAssistantFlyoutObject,
  userProfiles: UserProfilePageProvider,
  watcher: WatcherPageObject,
};
