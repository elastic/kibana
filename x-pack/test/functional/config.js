/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable kibana-custom/no-default-export */

import { resolve } from 'path';

import {
  SecurityPageProvider,
  MonitoringPageProvider,
  LogstashPageProvider,
  GraphPageProvider,
  GrokDebuggerPageProvider,
  WatcherPageProvider,
  ReportingPageProvider,
  SpaceSelectorPageProvider,
  AccountSettingProvider,
  InfraHomePageProvider,
} from './page_objects';

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
  PipelineListProvider,
  PipelineEditorProvider,
  RandomProvider,
  AceEditorProvider,
  GrokDebuggerProvider,

} from './services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }) {

  const kibanaCommonConfig = await readConfigFile(require.resolve('../../../test/common/config.js'));
  const kibanaFunctionalConfig = await readConfigFile(require.resolve('../../../test/functional/config.js'));
  const kibanaAPITestsConfig = await readConfigFile(require.resolve('../../../test/api_integration/config.js'));

  return {
    // list paths to the files that contain your plugins tests
    testFiles: [
      resolve(__dirname, './apps/graph'),
      resolve(__dirname, './apps/monitoring'),
      resolve(__dirname, './apps/watcher'),
      resolve(__dirname, './apps/dashboard_mode'),
      resolve(__dirname, './apps/security'),
      resolve(__dirname, './apps/spaces'),
      resolve(__dirname, './apps/logstash'),
      resolve(__dirname, './apps/grok_debugger'),
      resolve(__dirname, './apps/infra'),
    ],

    // define the name and providers for services that should be
    // available to your tests. If you don't specify anything here
    // only the built-in services will be available
    services: {
      ...kibanaFunctionalConfig.get('services'),
      esSupertest: kibanaAPITestsConfig.get('services.esSupertest'),
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
    },

    // just like services, PageObjects are defined as a map of
    // names to Providers. Merge in Kibana's or pick specific ones
    pageObjects: {
      ...kibanaFunctionalConfig.get('pageObjects'),
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
    },

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [
        'xpack.license.self_generated.type=trial',
        'xpack.security.enabled=true',
      ],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.xpack_main.telemetry.enabled=false',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
        // todo: remove this once https://github.com/elastic/kibana/issues/23837 is resolved
        '--xpack.canvas.enabled=false'
      ],
    },

    // the apps section defines the urls that
    // `PageObjects.common.navigateTo(appKey)` will use.
    // Merge urls for your plugin with the urls defined in
    // Kibana's config in order to use this helper
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
      login: {
        pathname: '/login'
      },
      monitoring: {
        pathname: '/app/monitoring'
      },
      logstashPipelines: {
        pathname: '/app/kibana',
        hash: '/management/logstash/pipelines'
      },
      graph: {
        pathname: '/app/graph',
      },
      grokDebugger: {
        pathname: '/app/kibana',
        hash: '/dev_tools/grokdebugger'
      },
      spaceSelector: {
        pathname: '/',
      },
      infraOps: {
        pathname: '/app/infra'
      }
    },

    // choose where esArchiver should load archives from
    esArchiver: {
      directory: resolve(__dirname, 'es_archives')
    },

    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(__dirname, 'screenshots')
    },

    junit: {
      reportName: 'X-Pack Functional Tests',
      rootDirectory: resolve(__dirname, '../../'),
    }
  };
}
