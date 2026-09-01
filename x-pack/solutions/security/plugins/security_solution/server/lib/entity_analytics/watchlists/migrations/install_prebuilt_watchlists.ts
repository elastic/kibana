/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
  StartServicesAccessor,
} from '@kbn/core/server';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';
import { PRIVILEGED_USER_MODIFIER } from '../../risk_score/modifiers/privileged_users';
import {
  getPrivilegedUserWatchlistSavedObjectId,
  PRIVILEGED_USER_WATCHLIST_NAME,
} from '../../../../../common/entity_analytics/watchlists/constants';
import { getStreamPatternFor } from '../../privilege_monitoring/data_sources/constants';
import type { WatchlistConfigClient } from '../management/watchlist_config';
import { WatchlistConfigClient as WatchlistConfigClientClass } from '../management/watchlist_config';
import {
  WatchlistEntitySourceClient,
  watchlistEntitySourceTypeName,
} from '../entity_sources/infra';
import { watchlistConfigTypeName } from '../management/saved_object/watchlist_config_type';
import type { StartPlugins } from '../../../../plugin';
import { generateWatchlistEntityIndexMappings } from '../entities/mappings';
import { ENTITY_ANALYTICS_WATCHLISTS_PREFIX } from '../entities/utils';

// Bump this when PREBUILT_WATCHLISTS definitions change
export const PREBUILT_WATCHLISTS_VERSION = 2;

const WATCHLIST_INDEX_TEMPLATE_NAME = 'entity_analytics_watchlists';

export const installWatchlistIndexTemplate = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  try {
    await esClient.indices.putIndexTemplate({
      name: WATCHLIST_INDEX_TEMPLATE_NAME,
      index_patterns: [`${ENTITY_ANALYTICS_WATCHLISTS_PREFIX}.*`],
      template: {
        mappings: generateWatchlistEntityIndexMappings(),
        settings: { hidden: true, auto_expand_replicas: '0-1' },
      },
      priority: 500,
    });
    logger.debug(`Watchlist index template '${WATCHLIST_INDEX_TEMPLATE_NAME}' installed`);
  } catch (err) {
    logger.error(`Failed to install watchlist index template: ${err.message}`);
  }
};

const OKTA_PRIVILEGED_ROLES = [
  'Super Administrator',
  'Organization Administrator',
  'Group Administrator',
  'Application Administrator',
  'Mobile Administrator',
  'Help Desk Administrator',
  'Report Administrator',
  'API Access Management Administrator',
  'Group Membership Administrator',
  'Read-only Administrator',
];

const buildKqlValuesFilter = (field: string, values: string[]): string =>
  `${field}: (${values.map((v) => `"${v}"`).join(' OR ')})`;

const OKTA_QUERY_RULE = buildKqlValuesFilter('user.roles', OKTA_PRIVILEGED_ROLES);
const AD_QUERY_RULE = 'entityanalytics_ad.user.privileged_group_member: true';

// Each prebuilt watchlist name must be unique — the find-by-attribute fallback in
// getOrCreateWatchlist uses name to locate a watchlist regardless of stored ID, so
// duplicate names would cause the wrong watchlist to be matched. Uniqueness is enforced
// by a unit test in install_prebuilt_watchlists.test.ts.
export const getPrebuiltWatchlists = (namespace: string) => [
  {
    id: getPrivilegedUserWatchlistSavedObjectId(namespace),
    name: PRIVILEGED_USER_WATCHLIST_NAME,
    description: 'System-managed watchlist for tracking privileged users',
    managed: true,
    riskModifier: PRIVILEGED_USER_MODIFIER,
    entitySources: [
      {
        type: 'entity_analytics_integration' as const,
        name: 'okta',
        indexPattern: getStreamPatternFor('entityanalytics_okta', namespace),
        integrationName: 'entityanalytics_okta',
        enabled: true,
        managed: true,
        queryRule: OKTA_QUERY_RULE,
      },
      {
        type: 'entity_analytics_integration' as const,
        name: 'ad',
        indexPattern: getStreamPatternFor('entityanalytics_ad', namespace),
        integrationName: 'entityanalytics_ad',
        enabled: true,
        managed: true,
        queryRule: AD_QUERY_RULE,
      },
    ],
  },
];

export type PrebuiltWatchlistDefinition = ReturnType<typeof getPrebuiltWatchlists>[number];

/**
 * Ensures all prebuilt watchlists exist for the given namespace.
 * Idempotent: skips creation if the watchlist already exists.
 */
export const ensurePrebuiltWatchlists = async ({
  watchlistClient,
  soClient,
  namespace,
  logger,
  esClient,
  getStartServices,
  hasEncryptionKey,
}: {
  watchlistClient: WatchlistConfigClient;
  soClient: SavedObjectsClientContract;
  namespace: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  getStartServices: StartServicesAccessor<StartPlugins>;
  hasEncryptionKey: boolean;
}) => {
  for (const watchlist of getPrebuiltWatchlists(namespace)) {
    const { id, entitySources, ...attrs } = watchlist;

    const watchlistId = await getOrCreateWatchlist({
      soClient,
      watchlistClient,
      logger,
      id,
      attrs,
    });

    if (watchlistId) {
      // Ensure entity sources exist, even if the watchlist was already present
      if (entitySources?.length) {
        await ensureEntitySources({
          watchlistClient,
          soClient,
          namespace,
          logger,
          watchlistId,
          entitySources,
          esClient,
          getStartServices,
          hasEncryptionKey,
        });
      }

      logger.info(`Prebuilt watchlist '${watchlist.name}' initialized.`);
    }
  }
};

// Three paths: (1) canonical ID found → reuse; (2) not found but exists under a legacy ID
// → locate by managed+name and reuse, cleaning up duplicates; (3) genuinely absent → create.
const getOrCreateWatchlist = async ({
  soClient,
  watchlistClient,
  logger,
  id,
  attrs,
}: {
  soClient: SavedObjectsClientContract;
  watchlistClient: WatchlistConfigClient;
  logger: Logger;
  id: string;
  attrs: Omit<PrebuiltWatchlistDefinition, 'id' | 'entitySources'>;
}): Promise<string | undefined> => {
  // Fast path: canonical ID exists (normal restarts).
  try {
    const existing = await watchlistClient.get(id);
    return existing.id ?? id;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    // watchlistClient.get re-throws 404s as a plain Error with 'not found' in the message
    // rather than a typed error — string matching is the only way to distinguish a missing
    // watchlist from a genuine failure. TODO: introduce a WatchlistNotFoundError in
    // watchlist_config.ts so this can use instanceof instead (https://github.com/elastic/kibana/issues/284325).
    if (!errorMessage.includes('not found')) {
      logger.error(`Error checking prebuilt watchlist '${attrs.name}': ${errorMessage}`);
      return undefined;
    }
  }

  // Canonical ID not found — search by managed + name so the watchlist is located
  // regardless of what ID it was stored under (e.g. after an ID format change).
  // Filtering by both fields uniquely identifies each prebuilt watchlist even when
  // multiple managed watchlists exist.
  interface WatchlistAttrs {
    name: string;
    managed: boolean;
  }
  const { saved_objects: matches } = await soClient.find<WatchlistAttrs>({
    type: watchlistConfigTypeName,
    filter: `watchlist-config.attributes.managed: true AND watchlist-config.attributes.name: "${attrs.name}"`,
    perPage: 10,
  });

  if (matches.length === 1) {
    logger.debug(
      `Found prebuilt watchlist '${attrs.name}' under id '${matches[0].id}', reusing it`
    );
    return matches[0].id;
  }

  if (matches.length > 1) {
    // Multiple matches means a duplicate exists (e.g. from a past ID format change).
    // Keep the oldest — the original is always created first, any duplicate always later.
    // Most references is a tiebreaker if timestamps are identical.
    const sorted: Array<SavedObjectsFindResult<WatchlistAttrs>> = [...matches].sort((a, b) => {
      const dateDiff = String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
      if (dateDiff !== 0) return dateDiff;
      return (b.references?.length ?? 0) - (a.references?.length ?? 0);
    });

    const [watchlistToKeep, ...stale] = sorted;

    // Delete stale duplicates using soClient directly — watchlistClient.delete would
    // cascade-delete entity sources that are shared with the watchlist we are keeping.
    for (const dup of stale) {
      try {
        await soClient.delete(watchlistConfigTypeName, dup.id, { refresh: 'wait_for' });
        logger.info(`Removed stale duplicate prebuilt watchlist '${dup.id}'`);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.warn(`Failed to remove stale duplicate watchlist '${dup.id}': ${errorMessage}`);
      }
    }

    logger.debug(
      `Found prebuilt watchlist '${attrs.name}' under id '${watchlistToKeep.id}', reusing it`
    );
    return watchlistToKeep.id;
  }

  // Genuinely not found — create with the canonical ID.
  logger.info(`Prebuilt watchlist '${attrs.name}' not found, creating...`);
  const created = await watchlistClient.create(attrs, { id });
  if (!created.id) {
    throw new Error('Prebuilt watchlist creation succeeded but no ID was returned');
  }
  return created.id;
};

const ensureEntitySources = async ({
  watchlistClient,
  soClient,
  namespace,
  logger,
  watchlistId,
  entitySources,
  esClient,
  getStartServices,
  hasEncryptionKey,
}: {
  watchlistClient: WatchlistConfigClient;
  soClient: SavedObjectsClientContract;
  namespace: string;
  logger: Logger;
  watchlistId: string;
  entitySources: PrebuiltWatchlistDefinition['entitySources'];
  esClient: ElasticsearchClient;
  getStartServices: StartServicesAccessor<StartPlugins>;
  hasEncryptionKey: boolean;
}) => {
  const sourceClient = new WatchlistEntitySourceClient({
    soClient,
    namespace,
    esClient,
    getStartServices,
    logger,
    hasEncryptionKey,
  });

  for (const entitySourceInput of entitySources) {
    const { sources } = await sourceClient.list({ name: entitySourceInput.name, per_page: 1 });
    const existingId = sources[0]?.id;

    if (existingId) {
      logger.debug(
        `Entity source '${entitySourceInput.name}' already exists, ensuring link to watchlist`
      );
      await watchlistClient.addEntitySourceReference(watchlistId, existingId);
    } else {
      const entitySource = await sourceClient.create(entitySourceInput);
      await watchlistClient.addEntitySourceReference(watchlistId, entitySource.id);
      logger.info(`Entity source '${entitySourceInput.name}' created and linked to watchlist`);
    }
  }
};

/**
 * Startup migration: discovers all Kibana spaces and ensures prebuilt
 * watchlists exist in every one of them.
 */
export const installPrebuiltWatchlists = async ({
  logger,
  getStartServices,
  hasEncryptionKey,
  spaceId,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  await installWatchlistIndexTemplate(esClient, logger);

  let namespaces: Set<string>;

  if (spaceId) {
    namespaces = new Set([spaceId]);
  } else {
    // 'space' is a hidden saved object type, so it must be explicitly included or
    // `find` silently returns an empty result and custom spaces are never discovered.
    const internalRepo = coreStart.savedObjects.createInternalRepository(['space']);
    const spacesResponse = await internalRepo.find({
      type: 'space',
      perPage: 1000,
    });

    // Always include 'default' — it may not have an explicit saved object
    namespaces = new Set<string>(['default']);
    for (const so of spacesResponse.saved_objects) {
      namespaces.add(so.id);
    }
  }

  for (const namespace of namespaces) {
    const soClient = buildScopedInternalSavedObjectsClientUnsafe({
      coreStart,
      namespace,
      includedHiddenTypes: [watchlistEntitySourceTypeName],
    });
    const watchlistClient = new WatchlistConfigClientClass({
      soClient,
      esClient,
      internalEsClient: esClient,
      namespace,
      logger,
    });

    await ensurePrebuiltWatchlists({
      watchlistClient,
      soClient,
      namespace,
      logger,
      esClient,
      getStartServices,
      hasEncryptionKey,
    });
  }
};
