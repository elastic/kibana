/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndexPatternAdapter,
  type SetIndexTemplateParams,
  type InstallParams,
  type InstallIndex,
} from '@kbn/index-adapter';
import { createDataStream, updateDataStreams } from './create_or_update_data_stream';

export class DataStreamSpacesAdapter extends IndexPatternAdapter {
  public setIndexTemplate(params: SetIndexTemplateParams) {
    super.setIndexTemplate({ ...params, isDataStream: true });
  }

  protected async _install(params: InstallParams): Promise<InstallIndex> {
    const { logger, pluginStop$, tasksTimeoutMs } = params;

    await this.installTemplates(params);

    const esClient = await params.esClient;
    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // Update existing space data streams
    await installFn(
      updateDataStreams({
        name: `${this.prefix}-*`,
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
        writeIndexOnly: this.writeIndexOnly,
        expandIndexPattern: this.expandIndexPattern,
      }),
      `update space data streams`
    );

    // define function to install data stream on demand
    return async (name: string) =>
      installFn(createDataStream({ name, esClient, logger }), `create ${name} data stream`);
  }

  /**
   * Method to create the data stream for a given space ID.
   * It resolves with the full data stream name.
   */
  public async installSpace(spaceId: string): Promise<string> {
    await this.createIndex(spaceId);
    return this.getIndexName(spaceId);
  }

  public async getInstalledSpaceName(spaceId: string): Promise<string | undefined> {
    return this.getInstalledIndexName(spaceId);
  }
}
