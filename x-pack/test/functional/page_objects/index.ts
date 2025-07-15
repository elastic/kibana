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
import { UserProfilePageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/user_profile_page';
import { SearchSessionsPageProvider } from '@kbn/test-suites-xpack-platform/functional/page_objects/search_sessions_management_page';
import { GraphPageObject } from '@kbn/test-suites-xpack-platform/functional/page_objects/graph_page';
import { ApiKeysPageProvider } from './api_keys_page';
import { AssetDetailsProvider } from './asset_details';
import { BannersPageObject } from './banners_page';
import { CrossClusterReplicationPageProvider } from './cross_cluster_replication_page';
import { DetectionsPageObject } from '../../security_solution_ftr/page_objects/detections';
import { EmbeddedConsoleProvider } from './embedded_console';
import { GeoFileUploadPageObject } from './geo_file_upload';
import { GrokDebuggerPageObject } from './grok_debugger_page';
import { IndexLifecycleManagementPageProvider } from './index_lifecycle_management_page';
import { IndexManagementPageProvider } from './index_management_page';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraHostsViewProvider } from './infra_hosts_view';
import { InfraLogsPageProvider } from './infra_logs_page';
import { InfraMetricsExplorerProvider } from './infra_metrics_explorer';
import { InfraSavedViewsProvider } from './infra_saved_views';
import { IngestPipelinesPageProvider } from './ingest_pipelines_page';
import { LicenseManagementPageProvider } from './license_management_page';
import { LogstashPageObject } from './logstash_page';
import { MaintenanceWindowsPageProvider } from './maintenance_windows_page';
import { NavigationalSearchPageObject } from './navigational_search';
import { ObservabilityLogsExplorerPageObject } from './observability_logs_explorer';
import { DatasetQualityPageObject } from './dataset_quality';
import { ObservabilityPageProvider } from './observability_page';
import { AlertControlsProvider } from './alert_controls';
import { RemoteClustersPageProvider } from './remote_clusters_page';
import { RollupPageObject } from './rollup_page';
import { ShareSavedObjectsToSpacePageProvider } from './share_saved_objects_to_space_page';
import { SnapshotRestorePageProvider } from './snapshot_restore_page';
import { StatusPageObject } from './status_page';
import { TagManagementPageObject } from './tag_management_page';
import { UptimePageObject } from './uptime_page';
import { SearchPlaygroundPageProvider } from './search_playground_page';
import { SearchSynonymsPageProvider } from './search_synonyms_page';
import { SearchQueryRulesPageProvider } from './search_query_rules_page';
import { SearchClassicNavigationProvider } from './search_classic_navigation';

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
  detections: DetectionsPageObject,
  embeddedConsole: EmbeddedConsoleProvider,
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
  observabilityLogsExplorer: ObservabilityLogsExplorerPageObject,
  datasetQuality: DatasetQualityPageObject,
  observability: ObservabilityPageProvider,
  alertControls: AlertControlsProvider,
  remoteClusters: RemoteClustersPageProvider,
  reporting: ReportingPageObject,
  roleMappings: RoleMappingsPageProvider,
  rollup: RollupPageObject,
  searchClassicNavigation: SearchClassicNavigationProvider,
  searchProfiler: SearchProfilerPageProvider,
  searchPlayground: SearchPlaygroundPageProvider,
  searchSynonyms: SearchSynonymsPageProvider,
  searchQueryRules: SearchQueryRulesPageProvider,
  searchSessionsManagement: SearchSessionsPageProvider,
  security: SecurityPageObject,
  shareSavedObjectsToSpace: ShareSavedObjectsToSpacePageProvider,
  snapshotRestore: SnapshotRestorePageProvider,
  spaceSelector: SpaceSelectorPageObject,
  statusPage: StatusPageObject,
  tagManagement: TagManagementPageObject,
  upgradeAssistant: UpgradeAssistantFlyoutObject,
  uptime: UptimePageObject,
  userProfiles: UserProfilePageProvider,
  watcher: WatcherPageObject,
};
