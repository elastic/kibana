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
  endpoint: 'GET /api/streams/{name}/dashboards',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListDashboardsResponse> {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    function isDashboard(asset: Asset): asset is DashboardAsset {
      return asset.assetType === 'dashboard';
    }

    return {
      dashboards: (
        await assetClient.getAssets({
          entityId: streamName,
          entityType: 'stream',
        })
      )
        .filter(isDashboard)
        .map(sanitizeDashboardAsset),
    };
  },
});

const linkDashboardRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/dashboards/{dashboardId}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<LinkDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);
    const {
      path: { dashboardId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await assetClient.linkAsset({
      entityId: streamName,
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
  endpoint: 'DELETE /api/streams/{name}/dashboards/{dashboardId}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UnlinkDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      path: { dashboardId, name: streamName },
    } = params;

    await assetClient.unlinkAsset({
      entityId: streamName,
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
  endpoint: 'POST /api/streams/{name}/dashboards/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await assetClient.getSuggestions({
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
  endpoint: `POST /api/streams/{name}/dashboards/_bulk`,
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
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
      path: { name: streamName },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(streamName);

    const result = await assetClient.bulk(
      {
        entityId: streamName,
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
