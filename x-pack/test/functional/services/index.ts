/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaFunctionalServices } from '@kbn/test-suites-src/functional/services';
import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { AceEditorProvider } from '@kbn/test-suites-xpack-platform/functional/services/ace_editor';
import { UserMenuProvider } from '@kbn/test-suites-xpack-platform/functional/services/user_menu';
import { SampleDataServiceProvider } from '@kbn/test-suites-xpack-platform/functional/services/sample_data';
import { GrokDebuggerProvider } from '@kbn/test-suites-xpack-platform/functional/services/grok_debugger';
import { SearchSessionsService } from '@kbn/test-suites-xpack-platform/functional/services/search_sessions';
import { CasesServiceProvider } from '@kbn/test-suites-xpack-platform/functional/services/cases';
import { ActionsServiceProvider } from '@kbn/test-suites-xpack-platform/functional/services/actions';
import { AiopsProvider } from '@kbn/test-suites-xpack-platform/functional/services/aiops';
import { RulesServiceProvider } from '@kbn/test-suites-xpack-platform/functional/services/rules';
import { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/functional/services/ml';
import { CanvasElementProvider } from '@kbn/test-suites-xpack-platform/functional/services/canvas_element';
import { TransformProvider } from '@kbn/test-suites-xpack-platform/functional/services/transform';
import { ReportingFunctionalProvider } from '@kbn/test-suites-xpack-platform/reporting_functional/services';
import { services as kibanaXPackApiIntegrationServices } from '../../api_integration/services';
import { services as commonServices } from '../../common/services';

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
import { UptimeProvider } from './uptime';
import { InfraSourceConfigurationFormProvider } from './infra_source_configuration_form';
import { ObservabilityProvider } from './observability';
import { DataStreamProvider } from './data_stream';
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
  ml: MachineLearningProvider,
  transform: TransformProvider,
  reporting: ReportingFunctionalProvider,
  sampleData: SampleDataServiceProvider,
  searchSessions: SearchSessionsService,
  observability: ObservabilityProvider,
  actions: ActionsServiceProvider,
  rules: RulesServiceProvider,
  cases: CasesServiceProvider,
  aiops: AiopsProvider,
  dataStreams: DataStreamProvider,
};
