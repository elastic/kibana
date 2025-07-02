/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import { ASSET_CRITICALITY_MAPPINGS_VERSIONS } from './constants';

interface AssetCriticalityMigrationClientOpts {
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  esClient: ElasticsearchClient;
}

const ECS_MAPPINGS_MIGRATION_QUERY = {
  bool: {
    must_not: {
      exists: {
        field: 'asset.criticality',
      },
    },
  },
};

const PAINLESS_SCRIPT = `
Map asset = new HashMap();
asset.put('criticality', ctx._source.criticality_level);
ctx._source.asset = asset;
if (ctx._source.id_field == 'user.name') {
  Map user = new HashMap();
  user.put('name', ctx._source.id_value);
  user.put('asset', asset);
  ctx._source.user = user;
} else {
  Map host = new HashMap();
  host.put('name', ctx._source.id_value);
  host.put('asset', asset);
  ctx._source.host = host;
}`;

export class AssetCriticalityMigrationClient {
  private readonly assetCriticalityDataClient: AssetCriticalityDataClient;
  constructor(private readonly options: AssetCriticalityMigrationClientOpts) {
    this.assetCriticalityDataClient = new AssetCriticalityDataClient({
      ...options,
      namespace: '*', // The migration is applied to all spaces
    });
  }

  public isMappingsMigrationRequired = async () => {
    const indicesMappings = await this.assetCriticalityDataClient.getIndexMappings();

    return Object.values(indicesMappings).some(
      ({ mappings }) => mappings._meta?.version !== ASSET_CRITICALITY_MAPPINGS_VERSIONS
    );
  };

  public isEcsDataMigrationRequired = async () => {
    const resp = await this.assetCriticalityDataClient.search({
      query: ECS_MAPPINGS_MIGRATION_QUERY,
      size: 1,
    });

    return resp.hits.hits.length > 0;
  };

  public migrateMappings = async () => {
    const spaceIds = await this.getAllSpacesWithAssetCriticalityInstalled();

    for (const spaceId of spaceIds) {
      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        ...this.options,
        namespace: spaceId,
      });
      try {
        await assetCriticalityDataClient.createOrUpdateIndex();
      } catch (error) {
        this.options.logger.error(
          `Failed to create or update index for space ${spaceId}: ${error.message}`
        );
      }
    }
  };

  public migrateEcsData = (abortSignal?: AbortSignal) => {
    return this.options.esClient.updateByQuery(
      {
        index: this.assetCriticalityDataClient.getIndex(),
        conflicts: 'proceed',
        ignore_unavailable: true,
        allow_no_indices: true,
        scroll_size: 10000,
        body: {
          query: ECS_MAPPINGS_MIGRATION_QUERY,
          script: {
            source: PAINLESS_SCRIPT,
            lang: 'painless',
          },
        },
      },
      {
        requestTimeout: '5m',
        retryOnTimeout: true,
        maxRetries: 2,
        signal: abortSignal,
      }
    );
  };

  public copyTimestampToEventIngestedForAssetCriticality = (abortSignal?: AbortSignal) => {
    return this.options.esClient.updateByQuery(
      {
        index: this.assetCriticalityDataClient.getIndex(),
        conflicts: 'proceed',
        ignore_unavailable: true,
        allow_no_indices: true,
        body: {
          query: {
            bool: {
              must_not: {
                exists: {
                  field: 'event.ingested',
                },
              },
            },
          },
          script: {
            source: 'ctx._source.event.ingested = ctx._source.@timestamp',
            lang: 'painless',
          },
        },
      },
      {
        requestTimeout: '5m',
        retryOnTimeout: true,
        maxRetries: 2,
        signal: abortSignal,
      }
    );
  };

  public getAllSpacesWithAssetCriticalityInstalled = async (): Promise<string[]> => {
    const indicesMappings = await this.assetCriticalityDataClient.getIndexMappings();
    const indices = Object.keys(indicesMappings);

    // we remove the last character from the index name to get the base index name
    // the last character is * to match all spaces
    const indexBase = this.assetCriticalityDataClient.getIndex().slice(0, -1);
    const namespaces: string[] = [];

    for (const index of indices) {
      const maybeNamespace = index.split(indexBase).at(-1);
      if (maybeNamespace) {
        namespaces.push(maybeNamespace);
      } else {
        this.options.logger.warn(
          `Index ${index} does not follow the expected naming convention for asset criticality indices.`
        );
      }
    }

    return namespaces;
  };
}
