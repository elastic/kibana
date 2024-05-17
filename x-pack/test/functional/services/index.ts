/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
import { services as kibanaFunctionalServices } from '../../../../test/functional/services';
import { services as kibanaXPackApiIntegrationServices } from '../../api_integration/services';
import { services as commonServices } from '../../common/services';
import { ReportingFunctionalProvider } from '../../reporting_functional/services';

// @ts-ignore not ts yet
import { AceEditorProvider } from './ace_editor';
import { ActionsServiceProvider } from './actions';
import { AiopsProvider } from './aiops';
import { CanvasElementProvider } from './canvas_element';
import { CasesServiceProvider } from './cases';
import { DataStreamProvider } from './data_stream';
// @ts-ignore not ts yet
import { GrokDebuggerProvider } from './grok_debugger';
import { InfraSourceConfigurationFormProvider } from './infra_source_configuration_form';
import { LogsUiProvider } from './logs_ui';
import { MachineLearningProvider } from './ml';
import {
  MonitoringAlertsProvider,
  MonitoringBeatDetailProvider,
  MonitoringBeatsListingProvider,
  MonitoringBeatsOverviewProvider,
  MonitoringBeatsSummaryStatusProvider,
  MonitoringClusterAlertsProvider,
  MonitoringClusterListProvider,
  MonitoringClusterOverviewProvider,
  MonitoringElasticsearchIndexDetailProvider,
  MonitoringElasticsearchIndicesProvider,
  MonitoringElasticsearchNodeDetailProvider,
  MonitoringElasticsearchNodesProvider,
  MonitoringElasticsearchOverviewProvider,
  MonitoringElasticsearchShardsProvider,
  MonitoringElasticsearchSummaryStatusProvider,
  MonitoringEnterpriseSearchOverviewProvider,
  MonitoringEnterpriseSearchSummaryStatusProvider,
  MonitoringKibanaInstanceProvider,
  MonitoringKibanaInstancesProvider,
  MonitoringKibanaOverviewProvider,
  MonitoringKibanaSummaryStatusProvider,
  MonitoringLogstashNodeDetailProvider,
  MonitoringLogstashNodesProvider,
  MonitoringLogstashOverviewProvider,
  MonitoringLogstashPipelineViewerProvider,
  MonitoringLogstashPipelinesProvider,
  MonitoringLogstashSummaryStatusProvider,
  MonitoringNoDataProvider,
  MonitoringSetupModeProvider,
  // @ts-ignore not ts yet
} from './monitoring';
import { ObservabilityProvider } from './observability';
// @ts-ignore not ts yet
import { PipelineEditorProvider } from './pipeline_editor';
// @ts-ignore not ts yet
import { PipelineListProvider } from './pipeline_list';
// @ts-ignore not ts yet
import { RandomProvider } from './random';
import { RulesServiceProvider } from './rules';
import { SampleDataServiceProvider } from './sample_data';
import { SearchSessionsService } from './search_sessions';
import { SloUiServiceProvider } from './slo';
import { TransformProvider } from './transform';
import { UptimeProvider } from './uptime';
// @ts-ignore not ts yet
import { UserMenuProvider } from './user_menu';
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
  reporting: ReportingFunctionalProvider,
  searchSessions: SearchSessionsService,
  observability: ObservabilityProvider,
  // compareImages: CompareImagesProvider,
  actions: ActionsServiceProvider,
  rules: RulesServiceProvider,
  cases: CasesServiceProvider,
  aiops: AiopsProvider,
  sampleData: SampleDataServiceProvider,
  dataStreams: DataStreamProvider,
  slo: kibanaXPackApiIntegrationServices.slo,
  dataViewApi: kibanaXPackApiIntegrationServices.dataViewApi,
  sloUi: SloUiServiceProvider,
};
