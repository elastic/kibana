/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIndex, updateIndices } from './create_or_update_index';
import { IndexAdapter, type IndexAdapterParams, type InstallParams } from './index_adapter';

export type InstallIndex = (indexSuffix: string) => Promise<void>;

export class IndexPatternAdapter extends IndexAdapter {
  protected installationPromises: Map<string, Promise<void>>;
  protected installIndexPromise?: Promise<InstallIndex>;

  constructor(protected readonly prefix: string, options: IndexAdapterParams) {
    super(`${prefix}-*`, options); // make indexTemplate `indexPatterns` match all index names
    this.installationPromises = new Map();
  }

  /** Method to create/update the templates, update existing indices and setup internal state for the adapter. */
  public async install(params: InstallParams): Promise<void> {
    this.installIndexPromise = this._install(params);
    await this.installIndexPromise;
  }

  protected async _install(params: InstallParams): Promise<InstallIndex> {
    const { logger, pluginStop$, tasksTimeoutMs } = params;

    await this.installTemplates(params);

    const esClient = await params.esClient;
    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // Update existing specific indices
    await installFn(
      updateIndices({
        name: this.name, // `${prefix}-*`
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
        writeIndexOnly: this.writeIndexOnly,
      }),
      `update specific indices`
    );

    // Define the function to create concrete indices on demand
    return async (name: string) =>
      installFn(createIndex({ name, esClient, logger }), `create ${name} index`);
  }

  /**
   * Method to create the index for a given index suffix.
   * Stores the installations promises to avoid concurrent installations for the same index.
   * Index creation will only be attempted once per index suffix and existence will be checked before creating.
   */
  public async createIndex(indexSuffix: string): Promise<void> {
    if (!this.installIndexPromise) {
      throw new Error('Cannot installIndex before install');
    }

    const existingInstallation = this.installationPromises.get(indexSuffix);
    if (existingInstallation) {
      return existingInstallation;
    }
    const indexName = this.getIndexName(indexSuffix);

    // Awaits for installIndexPromise to resolve to ensure templates are installed before the specific index is created.
    // This is a safety measure since the initial `install` call may not be awaited from the plugin lifecycle caller.
    // However, the promise will most likely be already fulfilled by the time `createIndex` is called, so this is a no-op.
    const installation = this.installIndexPromise
      .then((installIndex) => installIndex(indexName))
      .catch((err) => {
        this.installationPromises.delete(indexSuffix);
        throw err;
      });

    this.installationPromises.set(indexSuffix, installation);
    return installation;
  }

  /** Method to get the full index name for a given index suffix. */
  public getIndexName(indexSuffix: string): string {
    return `${this.prefix}-${indexSuffix}`;
  }

  /** Method to get the full index name for a given index suffix. It returns undefined if the index does not exist. */
  public async getInstalledIndexName(indexSuffix: string): Promise<string | undefined> {
    const existingInstallation = this.installationPromises.get(indexSuffix);
    if (!existingInstallation) {
      return undefined;
    }
    return existingInstallation.then(() => this.getIndexName(indexSuffix)).catch(() => undefined);
  }
}
