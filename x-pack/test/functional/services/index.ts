/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaFunctionalServices } from '../../../../test/functional/services';
import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
import { services as kibanaXPackApiIntegrationServices } from '../../api_integration/services';
import { services as commonServices } from '../../common/services';
import { ReportingFunctionalProvider } from '../../reporting_functional/services';

import {
  MonitoringNoDataProvider,
  MonitoringClusterListProvider,
  MonitoringClusterOverviewProvider,
  MonitoringClusterAlertsProvider,
  MonitoringElasticsearchSummaryStatusProvider,
  MonitoringElasticsearchOverviewProvider,
  MonitoringElasticsearchNodesProvider,
  MonitoringElasticsearchNodeDetailProvider,
  MonitoringElasticsearchIndicesProvider,
  MonitoringElasticsearchIndexDetailProvider,
  MonitoringElasticsearchShardsProvider,
  MonitoringBeatsOverviewProvider,
  MonitoringBeatsListingProvider,
  MonitoringBeatDetailProvider,
  MonitoringBeatsSummaryStatusProvider,
  MonitoringLogstashOverviewProvider,
  MonitoringLogstashNodesProvider,
  MonitoringLogstashNodeDetailProvider,
  MonitoringLogstashPipelinesProvider,
  MonitoringLogstashPipelineViewerProvider,
  MonitoringLogstashSummaryStatusProvider,
  MonitoringKibanaOverviewProvider,
  MonitoringKibanaInstancesProvider,
  MonitoringKibanaInstanceProvider,
  MonitoringKibanaSummaryStatusProvider,
  MonitoringSetupModeProvider,
  MonitoringAlertsProvider,
  MonitoringEnterpriseSearchOverviewProvider,
  MonitoringEnterpriseSearchSummaryStatusProvider,
  // @ts-ignore not ts yet
} from './monitoring';
// @ts-ignore not ts yet
import { PipelineListProvider } from './pipeline_list';
// @ts-ignore not ts yet
import { PipelineEditorProvider } from './pipeline_editor';
// @ts-ignore not ts yet
import { RandomProvider } from './random';
// @ts-ignore not ts yet
import { AceEditorProvider } from './ace_editor';
import { CanvasElementProvider } from './canvas_element';
// @ts-ignore not ts yet
import { GrokDebuggerProvider } from './grok_debugger';
// @ts-ignore not ts yet
import { UserMenuProvider } from './user_menu';
import { UptimeProvider } from './uptime';
import { InfraSourceConfigurationFormProvider } from './infra_source_configuration_form';
import { LogsUiProvider } from './logs_ui';
import { MachineLearningProvider } from './ml';
import { TransformProvider } from './transform';
import {
  DashboardDrilldownPanelActionsProvider,
  DashboardDrilldownsManageProvider,
  DashboardPanelTimeRangeProvider,
} from './dashboard';
import { SearchSessionsService } from './search_sessions';
import { ObservabilityProvider } from './observability';
import { CompareImagesProvider } from './compare_images';
import { RemoteEsProvider } from './remote_es/remote_es';
import { RemoteEsArchiverProvider } from './remote_es/remote_es_archiver';

// define the name and providers for services that should be
// available to your tests. If you don't specify anything here
// only the built-in services will be available
export const services = {
  ...kibanaFunctionalServices,
  ...commonServices,

  supertest: kibanaApiIntegrationServices.supertest,
  supertestWithoutAuth: kibanaXPackApiIntegrationServices.supertestWithoutAuth,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  monitoringNoData: MonitoringNoDataProvider,
  monitoringClusterList: MonitoringClusterListProvider,
  monitoringClusterOverview: MonitoringClusterOverviewProvider,
  monitoringClusterAlerts: MonitoringClusterAlertsProvider,
  monitoringElasticsearchSummaryStatus: MonitoringElasticsearchSummaryStatusProvider,
  monitoringElasticsearchOverview: MonitoringElasticsearchOverviewProvider,
  monitoringElasticsearchNodes: MonitoringElasticsearchNodesProvider,
  monitoringElasticsearchNodeDetail: MonitoringElasticsearchNodeDetailProvider,
  monitoringElasticsearchIndices: MonitoringElasticsearchIndicesProvider,
  monitoringElasticsearchIndexDetail: MonitoringElasticsearchIndexDetailProvider,
  monitoringElasticsearchShards: MonitoringElasticsearchShardsProvider,
  monitoringBeatsOverview: MonitoringBeatsOverviewProvider,
  monitoringBeatsListing: MonitoringBeatsListingProvider,
  monitoringBeatDetail: MonitoringBeatDetailProvider,
  monitoringBeatsSummaryStatus: MonitoringBeatsSummaryStatusProvider,
  monitoringLogstashOverview: MonitoringLogstashOverviewProvider,
  monitoringLogstashNodes: MonitoringLogstashNodesProvider,
  monitoringLogstashNodeDetail: MonitoringLogstashNodeDetailProvider,
  monitoringLogstashPipelines: MonitoringLogstashPipelinesProvider,
  monitoringLogstashPipelineViewer: MonitoringLogstashPipelineViewerProvider,
  monitoringLogstashSummaryStatus: MonitoringLogstashSummaryStatusProvider,
  monitoringKibanaOverview: MonitoringKibanaOverviewProvider,
  monitoringKibanaInstances: MonitoringKibanaInstancesProvider,
  monitoringKibanaInstance: MonitoringKibanaInstanceProvider,
  monitoringKibanaSummaryStatus: MonitoringKibanaSummaryStatusProvider,
  monitoringEnterpriseSearchOverview: MonitoringEnterpriseSearchOverviewProvider,
  monitoringEnterpriseSearchSummaryStatus: MonitoringEnterpriseSearchSummaryStatusProvider,
  monitoringSetupMode: MonitoringSetupModeProvider,
  monitoringAlerts: MonitoringAlertsProvider,
  pipelineList: PipelineListProvider,
  pipelineEditor: PipelineEditorProvider,
  random: RandomProvider,
  aceEditor: AceEditorProvider,
  canvasElement: CanvasElementProvider,
  grokDebugger: GrokDebuggerProvider,
  userMenu: UserMenuProvider,
  uptime: UptimeProvider,
  infraSourceConfigurationForm: InfraSourceConfigurationFormProvider,
  logsUi: LogsUiProvider,
  ml: MachineLearningProvider,
  transform: TransformProvider,
  dashboardDrilldownPanelActions: DashboardDrilldownPanelActionsProvider,
  dashboardDrilldownsManage: DashboardDrilldownsManageProvider,
  dashboardPanelTimeRange: DashboardPanelTimeRangeProvider,
  reporting: ReportingFunctionalProvider,
  searchSessions: SearchSessionsService,
  observability: ObservabilityProvider,
  compareImages: CompareImagesProvider,
  remoteEs: RemoteEsProvider,
  remoteEsArchiver: RemoteEsArchiverProvider,
};
