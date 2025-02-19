/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/observability-utils-server/es/storage';
import { StreamsPluginStartDependencies } from '../../../types';
import { AssetClient, StoredAssetLink } from './asset_client';
import { AssetStorageSettings, assetStorageSettings } from './storage_settings';

export class AssetService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<AssetClient> {
    const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<AssetStorageSettings, StoredAssetLink>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('assets'),
      assetStorageSettings
    );

    return new AssetClient({
      storageClient: adapter.getClient(),
      soClient: coreStart.savedObjects.getScopedClient(request),
      rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
    });
  }
}
