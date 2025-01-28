/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  Plugin,
  CoreStart,
  CoreSetup,
  Logger,
} from '@kbn/core/server';
import { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { isAgentlessEnabled } from '@kbn/fleet-plugin/server/services/utils/agentless';
import { getConnectorTypes } from '../common/lib/connector_types';
import type {
  SearchConnectorsPluginSetup as SearchConnectorsPluginSetup,
  SearchConnectorsPluginStart as SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStartDependencies,
} from './types';

import { AgentlessConnectorDeploymentsSyncService } from './task';
import { SearchConnectorsConfig } from './config';

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SearchConnectorsPluginSetupDependencies,
      SearchConnectorsPluginStartDependencies
    >
{
  private connectors: ConnectorServerSideDefinition[];
  private log: Logger;
  private readonly config: SearchConnectorsConfig;
  private agentlessConnectorDeploymentsSyncService: AgentlessConnectorDeploymentsSyncService;
  private isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.connectors = [];
    this.log = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.agentlessConnectorDeploymentsSyncService = new AgentlessConnectorDeploymentsSyncService(
      this.log
    );
    this.isServerless = false;
  }

  public setup(
    coreSetup: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    plugins: SearchConnectorsPluginSetupDependencies
  ) {
    const http = coreSetup.http;

    this.connectors = getConnectorTypes(http.staticAssets);
    this.isServerless = plugins.cloud && plugins.cloud.isServerlessEnabled;
    const coreStartServices = coreSetup.getStartServices();

    // There seems to be no way to check for agentless here
    // So we register a task, but do not execute it in `start` method
    this.log.debug('Registering agentless connectors infra sync task');

    coreStartServices
      .then(([coreStart, searchConnectorsPluginStartDependencies]) => {
        this.agentlessConnectorDeploymentsSyncService.registerInfraSyncTask(
          plugins,
          coreStart,
          searchConnectorsPluginStartDependencies
        );
      })
      .catch((err) => {
        this.log.error(`Error registering agentless connectors infra sync task`, err);
      });

    return {
      getConnectorTypes: () => this.connectors,
    };
  }

  public start(coreStart: CoreStart, plugins: SearchConnectorsPluginStartDependencies) {
    if (this.isServerless) {
      this.log.info(
        'Serverless is not supported, skipping agentless connectors infrastructure watcher task'
      );
    } else if (isAgentlessEnabled()) {
      this.log.info(
        'Agentless is supported, scheduling initial agentless connectors infrastructure watcher task'
      );
      this.agentlessConnectorDeploymentsSyncService
        .scheduleInfraSyncTask(this.config, plugins.taskManager)
        .catch((err) => {
          this.log.error(`Error scheduling agentless connectors infra sync task`, err);
        });
    } else {
      this.log.info(
        'Agentless is not supported, skipping scheduling initial agentless connectors infrastructure watcher task'
      );
    }
    return {
      getConnectors: () => this.connectors,
    };
  }

  public stop() {}
}
