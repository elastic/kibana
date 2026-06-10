/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import type {
  IdentityClassificationProvenance,
  PerTypeSourceIndices,
  PerTypeSourceProvenance,
} from '../../domain/streams_features';

export interface DiscoveredSourcesResponseBody {
  /** Whether KI-discovered sources are actually used for extraction (the flag). */
  enabled: boolean;
  /** Confidence floor applied when listing schema features. */
  minConfidence: number;
  /** Per-entity-type resolved source index patterns the store would extract from. */
  sources: PerTypeSourceIndices;
  /** Which stream/feature contributed each pattern, and on which identity fields. */
  provenance: PerTypeSourceProvenance[];
  /** Whether the KI confidence-classification feature (high/medium gate) is enabled. */
  confidenceClassificationEnabled: boolean;
  /** Per-source user identity classification (tier + namespace) the user engine would apply. */
  identityClassification: IdentityClassificationProvenance[];
}

/**
 * Read-only operator visibility into the KI-discovered, per-entity-type
 * extraction sources. Deliberately has NO mutation surface: the entity store
 * derives sources automatically from available schema features, so there is
 * nothing to select or deselect here. The only operator lever is upstream —
 * which streams Knowledge Indicators are run on.
 */
export function registerDiscoveredSources(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.internal.DISCOVERED_SOURCES,
      access: 'internal',
      summary: 'Get KI-discovered extraction sources',
      description:
        'Returns the per-entity-type index patterns the entity store auto-derives from Knowledge Indicators schema features, with provenance. Read-only.',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: false,
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse<DiscoveredSourcesResponseBody>> => {
          const entityStoreCtx = await ctx.entityStore;
          const { logger, logsExtractionClient } = entityStoreCtx;
          logger.debug('Discovered sources API invoked');

          const result = await logsExtractionClient.getDiscoveredSources();

          return res.ok({ body: result });
        }
      )
    );
}
