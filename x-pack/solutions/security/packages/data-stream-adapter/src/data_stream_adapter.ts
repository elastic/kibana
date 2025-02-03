/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetIndexTemplateParams } from '@kbn/index-adapter';
import { IndexAdapter, type InstallParams } from '@kbn/index-adapter';
import { createOrUpdateDataStream } from './create_or_update_data_stream';

export class DataStreamAdapter extends IndexAdapter {
  public setIndexTemplate(params: SetIndexTemplateParams) {
    super.setIndexTemplate({ ...params, isDataStream: true });
  }

  public async install(params: InstallParams) {
    this.installed = true;
    const { logger, pluginStop$, tasksTimeoutMs } = params;
    const esClient = await params.esClient;

    await this.installTemplates(params);

    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // create data stream when everything is ready
    await installFn(
      createOrUpdateDataStream({
        name: this.name,
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
        writeIndexOnly: this.writeIndexOnly,
      }),
      `${this.name} data stream`
    );
  }
}
