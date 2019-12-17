/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as kibanaFunctionalServices } from '../../../../test/functional/services';
import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
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
  MonitoringLogstashPipelinesProvider,
  MonitoringLogstashSummaryStatusProvider,
  MonitoringKibanaOverviewProvider,
  MonitoringKibanaInstancesProvider,
  MonitoringKibanaInstanceProvider,
  MonitoringKibanaSummaryStatusProvider,
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
// @ts-ignore not ts yet
import { GrokDebuggerProvider } from './grok_debugger';
// @ts-ignore not ts yet
import { UserMenuProvider } from './user_menu';
import { UptimeProvider } from './uptime';
import { InfraSourceConfigurationFormProvider } from './infra_source_configuration_form';
import { InfraLogStreamProvider } from './infra_log_stream';
import { MachineLearningProvider } from './ml';
import { TransformProvider } from './transform';

// define the name and providers for services that should be
// available to your tests. If you don't specify anything here
// only the built-in services will be available
export const services = {
  ...kibanaFunctionalServices,
  ...commonServices,

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
  monitoringLogstashPipelines: MonitoringLogstashPipelinesProvider,
  monitoringLogstashSummaryStatus: MonitoringLogstashSummaryStatusProvider,
  monitoringKibanaOverview: MonitoringKibanaOverviewProvider,
  monitoringKibanaInstances: MonitoringKibanaInstancesProvider,
  monitoringKibanaInstance: MonitoringKibanaInstanceProvider,
  monitoringKibanaSummaryStatus: MonitoringKibanaSummaryStatusProvider,
  pipelineList: PipelineListProvider,
  pipelineEditor: PipelineEditorProvider,
  random: RandomProvider,
  aceEditor: AceEditorProvider,
  grokDebugger: GrokDebuggerProvider,
  userMenu: UserMenuProvider,
  uptime: UptimeProvider,
  infraSourceConfigurationForm: InfraSourceConfigurationFormProvider,
  infraLogStream: InfraLogStreamProvider,
  ml: MachineLearningProvider,
  transform: TransformProvider,
};
