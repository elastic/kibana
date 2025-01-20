/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';

import type { ExperimentalFeatures } from '../../../common';

import { createKeywordBuilderPipeline, deleteKeywordBuilderPipeline } from './ingest_pipelines';

interface AssetInventoryClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  experimentalFeatures: ExperimentalFeatures;
}

// AssetInventoryDataClient is responsible for managing the asset inventory,
// including initializing and cleaning up resources such as Elasticsearch ingest pipelines.
export class AssetInventoryDataClient {
  private esClient: ElasticsearchClient;

  constructor(private readonly options: AssetInventoryClientOpts) {
    const { clusterClient } = options;
    this.esClient = clusterClient.asCurrentUser;
  }

  // Enables the asset inventory by deferring the initialization to avoid blocking the main thread.
  public async enable() {
    // Utility function to defer execution to the next tick using setTimeout.
    const run = <T>(fn: () => Promise<T>) =>
      new Promise<T>((resolve) => setTimeout(() => fn().then(resolve), 0));

    // Defer and execute the initialization process.
    await run(() => this.init());

    return { succeeded: true };
  }

  // Initializes the asset inventory by validating experimental feature flags and triggering asynchronous setup.
  public async init() {
    const { experimentalFeatures, logger } = this.options;

    if (!experimentalFeatures.assetInventoryStoreEnabled) {
      throw new Error('Universal entity store is not enabled');
    }

    logger.debug(`Initializing asset inventory`);

    this.asyncSetup().catch((e) =>
      logger.error(`Error during async setup of asset inventory: ${e.message}`)
    );
  }

  // Sets up the necessary resources for asset inventory, including creating Elasticsearch ingest pipelines.
  private async asyncSetup() {
    const { logger } = this.options;
    try {
      logger.debug('creating keyword builder pipeline');
      await createKeywordBuilderPipeline({
        logger,
        esClient: this.esClient,
      });
      logger.debug('keyword builder pipeline created');
    } catch (err) {
      logger.error(`Error initializing asset inventory: ${err.message}`);
      await this.delete();
    }
  }

  // Cleans up the resources associated with the asset inventory, such as removing the ingest pipeline.
  public async delete() {
    const { logger } = this.options;

    logger.debug(`Deleting asset inventory`);

    try {
      logger.debug(`Deleting asset inventory keyword builder pipeline`);

      await deleteKeywordBuilderPipeline({
        logger,
        esClient: this.esClient,
      }).catch((err) => {
        logger.error('Error on deleting keyword builder pipeline', err);
      });

      logger.debug(`Deleted asset inventory`);
      return { deleted: true };
    } catch (err) {
      logger.error(`Error deleting asset inventory: ${err.message}`);
      throw err;
    }
  }
}
