/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import { internal } from '@hapi/boom';
import { Asset, DashboardAsset } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';

export interface SanitizedDashboardAsset {
  id: string;
  label: string;
  tags: string[];
}

export interface ListDashboardsResponse {
  dashboards: SanitizedDashboardAsset[];
}

export interface LinkDashboardResponse {
  acknowledged: boolean;
}

export interface UnlinkDashboardResponse {
  acknowledged: boolean;
}

export interface SuggestDashboardResponse {
  suggestions: SanitizedDashboardAsset[];
}

export type BulkUpdateAssetsResponse =
  | {
      acknowledged: boolean;
    }
  | { errors: ErrorCause[] };

function sanitizeDashboardAsset(asset: DashboardAsset): SanitizedDashboardAsset {
  return {
    id: asset.assetId,
    label: asset.label,
    tags: asset.tags,
  };
}

const listDashboardsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/dashboards',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  async handler({ params, request, assets }): Promise<ListDashboardsResponse> {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { id: streamId },
    } = params;

    function isDashboard(asset: Asset): asset is DashboardAsset {
      return asset.assetType === 'dashboard';
    }

    return {
      dashboards: (
        await assetsClient.getAssets({
          entityId: streamId,
          entityType: 'stream',
        })
      )
        .filter(isDashboard)
        .map(sanitizeDashboardAsset),
    };
  },
});

const linkDashboardRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}/dashboards/{dashboardId}',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<LinkDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const {
      path: { dashboardId, id: streamId },
    } = params;

    await streamsClient.ensureStream(streamId);

    await assetClient.linkAsset({
      entityId: streamId,
      entityType: 'stream',
      assetId: dashboardId,
      assetType: 'dashboard',
    });

    return {
      acknowledged: true,
    };
  },
});

const unlinkDashboardRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{id}/dashboards/{dashboardId}',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<UnlinkDashboardResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { dashboardId, id: streamId },
    } = params;

    await assetsClient.unlinkAsset({
      entityId: streamId,
      entityType: 'stream',
      assetId: dashboardId,
      assetType: 'dashboard',
    });

    return {
      acknowledged: true,
    };
  },
});

const suggestDashboardsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/dashboards/_suggestions',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<SuggestDashboardResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await assetsClient.getSuggestions({
        assetTypes: ['dashboard'],
        query,
        tags,
      })
    ).assets.map((asset) => {
      return sanitizeDashboardAsset(asset as DashboardAsset);
    });

    return {
      suggestions,
    };
  },
});

const dashboardSchema = z.object({
  id: z.string(),
});

const bulkDashboardsRoute = createServerRoute({
  endpoint: `POST /api/streams/{id}/dashboards/_bulk`,
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    body: z.object({
      operations: z.array(
        z.union([
          z.object({
            index: dashboardSchema,
          }),
          z.object({
            delete: dashboardSchema,
          }),
        ])
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<BulkUpdateAssetsResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const {
      path: { id: streamId },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(streamId);

    const result = await assetClient.bulk(
      {
        entityId: streamId,
        entityType: 'stream',
      },
      operations.map((operation) => {
        if ('index' in operation) {
          return {
            index: {
              asset: {
                assetType: 'dashboard',
                assetId: operation.index.id,
              },
            },
          };
        }
        return {
          delete: {
            asset: {
              assetType: 'dashboard',
              assetId: operation.delete.id,
            },
          },
        };
      })
    );

    if (result.errors) {
      logger.error(`Error indexing some items`);
      throw internal(`Could not index all items`, { errors: result.errors });
    }

    return { acknowledged: true };
  },
});

export const dashboardRoutes = {
  ...listDashboardsRoute,
  ...linkDashboardRoute,
  ...unlinkDashboardRoute,
  ...suggestDashboardsRoute,
  ...bulkDashboardsRoute,
};
