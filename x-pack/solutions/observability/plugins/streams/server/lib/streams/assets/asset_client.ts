/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import { IStorageClient } from '@kbn/observability-utils-server/es/storage';
import { keyBy } from 'lodash';
import objectHash from 'object-hash';
import pLimit from 'p-limit';
import {
  ASSET_TYPES,
  Asset,
  AssetLink,
  AssetType,
  DashboardAsset,
  SloAsset,
  RuleAsset,
} from '../../../../common/assets';
import { ASSET_ENTITY_ID, ASSET_ENTITY_TYPE, ASSET_TYPE } from './fields';
import { AssetStorageSettings } from './storage_settings';

function sloSavedObjectToAsset(
  sloId: string,
  savedObject: SavedObject<{ name: string; tags: string[] }>
): SloAsset {
  return {
    assetId: sloId,
    label: savedObject.attributes.name,
    tags: savedObject.attributes.tags.concat(
      savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id)
    ),
    assetType: 'slo',
  };
}

function dashboardSavedObjectToAsset(
  dashboardId: string,
  savedObject: SavedObject<{ title: string }>
): DashboardAsset {
  return {
    assetId: dashboardId,
    label: savedObject.attributes.title,
    tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
    assetType: 'dashboard',
  };
}

function ruleToAsset(ruleId: string, rule: SanitizedRule): RuleAsset {
  return {
    assetType: 'rule',
    assetId: ruleId,
    label: rule.name,
    tags: rule.tags,
  };
}

function getAssetDocument({
  assetId,
  entityId,
  entityType,
  assetType,
}: AssetLink & { entityId: string; entityType: string }) {
  const doc = {
    'asset.id': assetId,
    'asset.type': assetType,
    'entity.id': entityId,
    'entity.type': entityType,
  };

  return {
    _id: objectHash(doc),
    ...doc,
  };
}

interface AssetBulkIndexOperation {
  index: { asset: AssetLink };
}
interface AssetBulkDeleteOperation {
  delete: { asset: AssetLink };
}

export type AssetBulkOperation = AssetBulkIndexOperation | AssetBulkDeleteOperation;

export interface StoredAssetLink {
  'asset.id': string;
  'asset.type': AssetType;
  'entity.id': string;
  'entity.type': string;
}

export class AssetClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<AssetStorageSettings, StoredAssetLink>;
      soClient: SavedObjectsClientContract;
      rulesClient: RulesClient;
    }
  ) {}

  async linkAsset(
    properties: {
      entityId: string;
      entityType: string;
    } & AssetLink
  ) {
    const { _id: id, ...document } = getAssetDocument(properties);

    await this.clients.storageClient.index({
      id,
      document,
    });
  }

  async syncAssetList({
    entityId,
    entityType,
    assetType,
    assetIds,
  }: {
    entityId: string;
    entityType: string;
    assetType: AssetType;
    assetIds: string[];
  }) {
    const assetsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(ASSET_ENTITY_ID, entityId),
            ...termQuery(ASSET_ENTITY_TYPE, entityType),
            ...termQuery(ASSET_TYPE, assetType),
          ],
        },
      },
    });

    const existingAssetLinks = assetsResponse.hits.hits.map((hit) => hit._source);

    const newAssetIds = assetIds.filter(
      (assetId) =>
        !existingAssetLinks.some((existingAssetLink) => existingAssetLink['asset.id'] === assetId)
    );

    const assetIdsToRemove = existingAssetLinks
      .map((existingAssetLink) => existingAssetLink['asset.id'])
      .filter((assetId) => !assetIds.includes(assetId));

    await Promise.all([
      ...newAssetIds.map((assetId) =>
        this.linkAsset({
          entityId,
          entityType,
          assetId,
          assetType,
        })
      ),
      ...assetIdsToRemove.map((assetId) =>
        this.unlinkAsset({
          entityId,
          entityType,
          assetId,
          assetType,
        })
      ),
    ]);
  }

  async unlinkAsset(
    properties: {
      entityId: string;
      entityType: string;
    } & AssetLink
  ) {
    const { _id: id } = getAssetDocument(properties);

    await this.clients.storageClient.delete({ id });
  }

  async clean() {
    await this.clients.storageClient.clean();
  }

  async getAssetIds({
    entityId,
    entityType,
    assetType,
  }: {
    entityId: string;
    entityType: 'stream';
    assetType: AssetType;
  }): Promise<string[]> {
    const assetsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(ASSET_ENTITY_ID, entityId),
            ...termQuery(ASSET_ENTITY_TYPE, entityType),
            ...termQuery(ASSET_TYPE, assetType),
          ],
        },
      },
    });

    return assetsResponse.hits.hits.map((hit) => hit._source['asset.id']);
  }

  async bulk(
    { entityId, entityType }: { entityId: string; entityType: string },
    operations: AssetBulkOperation[]
  ) {
    return await this.clients.storageClient.bulk({
      operations: operations.map((operation) => {
        const { _id, ...document } = getAssetDocument({
          ...Object.values(operation)[0].asset,
          entityId,
          entityType,
        });

        if ('index' in operation) {
          return {
            index: {
              document,
              _id,
            },
          };
        }

        return {
          delete: {
            _id,
          },
        };
      }),
    });
  }

  async getAssets({
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: 'stream';
  }): Promise<Asset[]> {
    const assetsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(ASSET_ENTITY_ID, entityId),
            ...termQuery(ASSET_ENTITY_TYPE, entityType),
          ],
        },
      },
    });

    const assetLinks = assetsResponse.hits.hits.map((hit) => hit._source);

    if (!assetLinks.length) {
      return [];
    }

    const idsByType = Object.fromEntries(
      Object.values(ASSET_TYPES).map((type) => [type, [] as string[]])
    ) as Record<AssetType, string[]>;

    assetLinks.forEach((assetLink) => {
      const assetType = assetLink['asset.type'] as AssetType;
      const assetId = assetLink['asset.id'];
      idsByType[assetType].push(assetId);
    });

    const limiter = pLimit(10);

    const [dashboards, rules, slos] = await Promise.all([
      idsByType.dashboard.length
        ? this.clients.soClient
            .bulkGet<{ title: string }>(
              idsByType.dashboard.map((dashboardId) => ({ type: 'dashboard', id: dashboardId }))
            )
            .then((response) => {
              const dashboardsById = keyBy(response.saved_objects, 'id');

              return idsByType.dashboard.flatMap((dashboardId): Asset[] => {
                const dashboard = dashboardsById[dashboardId];
                if (dashboard && !dashboard.error) {
                  return [dashboardSavedObjectToAsset(dashboardId, dashboard)];
                }
                return [];
              });
            })
        : [],
      Promise.all(
        idsByType.rule.map((ruleId) => {
          return limiter(() =>
            this.clients.rulesClient.get({ id: ruleId }).then((rule): Asset => {
              return ruleToAsset(ruleId, rule);
            })
          );
        })
      ),
      idsByType.slo.length
        ? this.clients.soClient
            .find<{ name: string; tags: string[] }>({
              type: 'slo',
              filter: `slo.attributes.id:(${idsByType.slo
                .map((sloId) => `"${sloId}"`)
                .join(' OR ')})`,
              perPage: idsByType.slo.length,
            })
            .then((soResponse) => {
              const sloDefinitionsById = keyBy(soResponse.saved_objects, 'slo.attributes.id');

              return idsByType.slo.flatMap((sloId): Asset[] => {
                const sloDefinition = sloDefinitionsById[sloId];
                if (sloDefinition && !sloDefinition.error) {
                  return [sloSavedObjectToAsset(sloId, sloDefinition)];
                }
                return [];
              });
            })
        : [],
    ]);

    return [...dashboards, ...rules, ...slos];
  }

  async getSuggestions({
    query,
    assetTypes,
    tags,
  }: {
    query: string;
    assetTypes?: AssetType[];
    tags?: string[];
  }): Promise<{ hasMore: boolean; assets: Asset[] }> {
    const perPage = 101;

    const searchAll = !assetTypes;

    const searchDashboardsOrSlos =
      searchAll || assetTypes.includes('dashboard') || assetTypes.includes('slo');

    const searchRules = searchAll || assetTypes.includes('rule');

    const [suggestionsFromSlosAndDashboards, suggestionsFromRules] = await Promise.all([
      searchDashboardsOrSlos
        ? this.clients.soClient
            .find({
              type: ['dashboard' as const, 'slo' as const].filter(
                (type) => searchAll || assetTypes.includes(type)
              ),
              search: query,
              perPage,
              ...(tags
                ? {
                    hasReferenceOperator: 'OR',
                    hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
                  }
                : {}),
            })
            .then((results) => {
              return results.saved_objects.map((savedObject) => {
                if (savedObject.type === 'slo') {
                  const sloSavedObject = savedObject as SavedObject<{
                    id: string;
                    name: string;
                    tags: string[];
                  }>;
                  return sloSavedObjectToAsset(sloSavedObject.attributes.id, sloSavedObject);
                }

                const dashboardSavedObject = savedObject as SavedObject<{
                  title: string;
                }>;

                return dashboardSavedObjectToAsset(dashboardSavedObject.id, dashboardSavedObject);
              });
            })
        : Promise.resolve([]),
      searchRules
        ? this.clients.rulesClient
            .find({
              options: {
                perPage,
                ...(tags
                  ? {
                      hasReferenceOperator: 'OR',
                      hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
                    }
                  : {}),
              },
            })
            .then((results) => {
              return results.data.map((rule) => {
                return ruleToAsset(rule.id, rule);
              });
            })
        : Promise.resolve([]),
    ]);

    return {
      assets: [...suggestionsFromRules, ...suggestionsFromSlosAndDashboards],
      hasMore:
        Math.max(suggestionsFromSlosAndDashboards.length, suggestionsFromRules.length) >
        perPage - 1,
    };
  }
}
