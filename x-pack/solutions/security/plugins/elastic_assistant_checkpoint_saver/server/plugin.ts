/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { ElasticSearchSaver } from '@kbn/langgraph-checkpoint-saver/server/elastic-search-checkpoint-saver';
import { CreateDataStreamClient } from './src/lib/create_data_stream_client'

import { BehaviorSubject, ReplaySubject, type Subject } from 'rxjs';
import { ElasticAssistantCheckpointSaverPluginCoreSetupDependencies, ElasticAssistantCheckpointSaverPluginSetup, ElasticAssistantCheckpointSaverPluginSetupDependencies, ElasticAssistantCheckpointSaverPluginStart, ElasticAssistantCheckpointSaverPluginStartDependencies } from './types';
import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';

export class ElasticAssistantCheckpointSaver
  implements
  Plugin<
    ElasticAssistantCheckpointSaverPluginSetup,
    ElasticAssistantCheckpointSaverPluginStart,
    ElasticAssistantCheckpointSaverPluginSetupDependencies,
    ElasticAssistantCheckpointSaverPluginStartDependencies
  > {
  private pluginStop$: Subject<void>;
  private readonly logger: Logger;
  private readonly createDatastreamClient: CreateDataStreamClient;

  private checkpointDataStream: DataStreamSpacesAdapter
  private checkpointWritesDataStream: DataStreamSpacesAdapter
  private isInitializing: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
  private initialized: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);

  private initPromise: ReturnType<typeof this.initializeResources> | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.createDatastreamClient = new CreateDataStreamClient()

    this.checkpointDataStream = this.createDatastreamClient.createDataStream({
      resource: 'checkpoint',
      kibanaVersion: initializerContext.env.packageInfo.version,
      fieldMap: ElasticSearchSaver.checkpointFieldMap,
    });

    this.checkpointWritesDataStream = this.createDatastreamClient.createDataStream({
      resource: 'checkpointWrites',
      kibanaVersion: initializerContext.env.packageInfo.version,
      fieldMap: ElasticSearchSaver.checkpointWritesFieldMap,
    });
  }

  public setup(
    core: ElasticAssistantCheckpointSaverPluginCoreSetupDependencies,
    plugins: ElasticAssistantCheckpointSaverPluginSetupDependencies
  ): ElasticAssistantCheckpointSaverPluginSetup {

    this.initPromise = this.initializeResources(core);

    return {

    };
  }

  public start(
    core: CoreStart,
    plugins: ElasticAssistantCheckpointSaverPluginStartDependencies
  ): ElasticAssistantCheckpointSaverPluginStart {
    core.elasticsearch.client

    const elasticSearchSaver = new ElasticSearchSaver({
      client: core.elasticsearch.client.asInternalUser,
      checkpointIndex: CreateDataStreamClient.resourceNames.indexTemplate.checkpoint,
      checkpointWritesIndex: CreateDataStreamClient.resourceNames.indexTemplate.checkpointWrites,
      logger: this.logger
    })

    return {
      getCheckpointSaver: async () => {
        await this.initPromise // Ensure the setup is complete before returning the saver
        return elasticSearchSaver;
      }
    };
  }

  private async initializeResources(core: ElasticAssistantCheckpointSaverPluginCoreSetupDependencies) {
    this.isInitializing.next(true)

    this.logger.info('Initializing AI assistant checkpoint saver resources...');
    try {
      const esClient = await core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser)

      await this.checkpointDataStream.install({
        esClient,
        logger: this.logger,
        pluginStop$: this.pluginStop$,
      });

      await this.checkpointWritesDataStream.install({
        esClient,
        logger: this.logger,
        pluginStop$: this.pluginStop$,
      });
    } catch (error) {
      this.logger.warn(`Error initializing AI assistant checkpoint saver: ${error.message}`);
      this.initialized.next(false);
      this.isInitializing.next(false);
      throw error;
    } finally {
      this.initialized.next(true);
      this.isInitializing.next(false);
    }
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }

}
