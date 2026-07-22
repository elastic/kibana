/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '../../../../../../common';
import type { ResolutionClient } from '../../..';
import { NAMESPACE_PRIORITY, selectTarget } from '../../..';
import { getFieldValue } from '../../../../../../common/domain/euid/commons';
import { ENTITY_ID_FIELD } from '../../../../../../common/domain/definitions/common_fields';
import type { MaintainerTelemetryClient } from '../../../../../tasks/entity_maintainers/maintainer_telemetry_client';
import type { PerRuleState } from '../automated_resolution/types';
import { getFieldStringValues, readRelatedUserBundleForSeed } from './left';
import {
  SEED_IDENTITY_PREFILTER_FIELDS,
  type CandidateEntity,
  type RelatedUserAliasResolutionLastRun,
  type SeedEntity,
} from './types';

const ENTITY_TYPE = 'user';
const PAGE_SIZE = 10_000;
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENTITY_NAMESPACE_FIELD = 'entity.namespace';
const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';
// The alias resolution seeds and target priority intentionally use the same IDP namespace set.
const IDP_NAMESPACES = NAMESPACE_PRIORITY;
const RIGHT_MATCH_FIELDS = ['user.id', 'user.name', 'user.email', 'user.full_name'] as const;
const LOCAL_NAMESPACE = 'local';
const GENERIC_SERVICE_ACCOUNTS = new Set([
  'system',
  'local service',
  'network service',
  'service account',
]);

export interface RunRelatedUserAliasResolutionDeps {
  state: PerRuleState;
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolutionClient: ResolutionClient;
  abortController: AbortController;
  telemetry: MaintainerTelemetryClient;
}

const normalize = (value: string): string => value.trim().toLowerCase();

const isWellKnownOrSharedValue = (value: string): boolean => {
  const normalized = normalize(value);
  return (
    GENERIC_SERVICE_ACCOUNTS.has(normalized) ||
    // Windows well-known SIDs: LocalSystem/LocalService/NetworkService and built-in groups.
    /^s-1-5-(18|19|20)$/i.test(value) ||
    /^s-1-5-32-/i.test(value)
  );
};

const cleanRelatedUsers = (relatedUsers: string[], excludedValues: string[]): string[] => {
  const excluded = new Set(excludedValues.map(normalize));
  return [
    ...new Set(
      relatedUsers
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .filter((value) => !excluded.has(normalize(value)))
        .filter((value) => !isWellKnownOrSharedValue(value))
    ),
  ];
};

const toSeedEntity = (source: Record<string, unknown>): SeedEntity | undefined => {
  const entityId = getFieldValue(source, ENTITY_ID_FIELD);
  const namespace = getFieldValue(source, ENTITY_NAMESPACE_FIELD);

  if (!entityId || !namespace) {
    return undefined;
  }

  return { entityId, namespace, source };
};

// Seeds are unresolved IDP user entities whose own entityanalytics source
// records may contain related.user values that point to aliases in other systems.
export const collectSeeds = async ({
  esClient,
  index,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  index: string;
  abortSignal: AbortSignal;
}): Promise<SeedEntity[]> => {
  const seeds: SeedEntity[] = [];
  let searchAfter: SortResults | undefined;

  while (!abortSignal.aborted) {
    const response = await esClient.search<Record<string, unknown>>(
      {
        index,
        size: PAGE_SIZE,
        query: {
          bool: {
            filter: [
              { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
              { terms: { [ENTITY_NAMESPACE_FIELD]: [...IDP_NAMESPACES] } },
              { bool: { must_not: { exists: { field: RESOLVED_TO_FIELD } } } },
            ],
          },
        },
        sort: [{ [FIRST_SEEN_FIELD]: { order: 'asc' } }, { [ENTITY_ID_FIELD]: { order: 'asc' } }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        _source: [ENTITY_ID_FIELD, ENTITY_NAMESPACE_FIELD, ...SEED_IDENTITY_PREFILTER_FIELDS],
      },
      { signal: abortSignal }
    );

    const hits = response.hits.hits;
    seeds.push(
      ...hits
        .map((hit) => (hit._source ? toSeedEntity(hit._source) : undefined))
        .filter((seed): seed is SeedEntity => seed !== undefined)
    );

    if (hits.length < PAGE_SIZE) {
      break;
    }

    const lastSort = hits[hits.length - 1]?.sort;
    if (!lastSort) {
      break;
    }
    searchAfter = lastSort;
  }

  return seeds;
};

const matchesValue = (source: Record<string, unknown>, value: string): boolean => {
  const normalized = normalize(value);
  return RIGHT_MATCH_FIELDS.some((field) =>
    getFieldStringValues(source, field).some(
      (candidateValue) => normalize(candidateValue) === normalized
    )
  );
};

const findCandidates = async ({
  esClient,
  index,
  value,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  index: string;
  value: string;
  abortSignal: AbortSignal;
}): Promise<CandidateEntity[]> => {
  const response = await esClient.search<Record<string, unknown>>(
    {
      index,
      size: 100,
      query: {
        bool: {
          filter: [
            { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
            { bool: { must_not: { exists: { field: RESOLVED_TO_FIELD } } } },
            { bool: { must_not: { term: { [ENTITY_NAMESPACE_FIELD]: LOCAL_NAMESPACE } } } },
            {
              bool: {
                should: RIGHT_MATCH_FIELDS.map((field) => ({
                  term: {
                    [field]: {
                      value,
                      case_insensitive: true,
                    },
                  },
                })),
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      _source: [ENTITY_ID_FIELD, ENTITY_NAMESPACE_FIELD, RESOLVED_TO_FIELD, ...RIGHT_MATCH_FIELDS],
    },
    { signal: abortSignal }
  );

  const candidates = new Map<string, CandidateEntity>();
  for (const hit of response.hits.hits) {
    const source = hit._source;
    if (!source || !matchesValue(source, value)) {
      continue;
    }

    const entityId = getFieldValue(source, ENTITY_ID_FIELD);
    const namespace = getFieldValue(source, ENTITY_NAMESPACE_FIELD);
    if (!entityId || !namespace || candidates.has(entityId)) {
      continue;
    }

    candidates.set(entityId, { entityId, namespace, source });
  }

  return [...candidates.values()];
};

/**
 * Runs the default-off related.user alias resolution rule.
 *
 * For each unresolved IDP seed, read the seed's own entityanalytics source
 * record, clean its related.user values, collect unambiguous entity-store
 * candidates across all values, then link the whole group once by namespace
 * priority. The source read is EUID-confirmed so records that merely mention
 * the seed do not become alias-resolution input.
 */
export async function runRelatedUserAliasResolution(
  deps: RunRelatedUserAliasResolutionDeps
): Promise<PerRuleState> {
  const { state, namespace, esClient, logger, resolutionClient, abortController, telemetry } = deps;
  const index = getLatestEntitiesIndexName(namespace);
  const seeds = await collectSeeds({ esClient, index, abortSignal: abortController.signal });
  const lastRun: RelatedUserAliasResolutionLastRun = {
    seedsScanned: seeds.length,
    linksCreated: 0,
    cascadeRetargeted: 0,
    skippedAmbiguous: 0,
    cascadesBlocked: 0,
    failedGroups: 0,
  };

  for (const seed of seeds) {
    if (abortController.signal.aborted) {
      return state;
    }

    const sourceRelatedUserValues = await readRelatedUserBundleForSeed({
      esClient,
      seed,
      abortSignal: abortController.signal,
    });
    if (!sourceRelatedUserValues) {
      continue;
    }

    const values = cleanRelatedUsers(
      sourceRelatedUserValues.relatedUsers,
      sourceRelatedUserValues.excludedValues
    );
    const candidatesForSeed = new Map<string, CandidateEntity>();
    for (const value of values) {
      if (abortController.signal.aborted) {
        return state;
      }

      try {
        const candidates = await findCandidates({
          esClient,
          index,
          value,
          abortSignal: abortController.signal,
        });
        const candidatesExcludingSeed = candidates.filter(
          (candidate) => candidate.entityId !== seed.entityId
        );

        if (candidatesExcludingSeed.length > 1) {
          lastRun.skippedAmbiguous++;
          continue;
        }

        if (candidatesExcludingSeed.length === 0) {
          continue;
        }

        candidatesForSeed.set(candidatesExcludingSeed[0].entityId, candidatesExcludingSeed[0]);
      } catch (error) {
        lastRun.failedGroups++;
        logger.warn(`Failed to process related_user_alias_resolution value '${value}': ${error}`);
      }
    }

    const group = [seed, ...candidatesForSeed.values()];
    if (group.length < 2) {
      continue;
    }

    try {
      const target = selectTarget(group);
      const aliasIds = group
        .filter((entity) => entity.entityId !== target.entityId)
        .map((entity) => entity.entityId);
      if (aliasIds.length === 0) {
        continue;
      }

      const result = await resolutionClient.cascadeLinkEntities(target.entityId, aliasIds);
      lastRun.linksCreated += result.linked.length;
      lastRun.cascadeRetargeted += result.retargeted.length;
      lastRun.cascadesBlocked += result.cascadesBlocked;
    } catch (error) {
      lastRun.failedGroups++;
      logger.warn(
        `Failed to cascade related_user_alias_resolution seed '${seed.entityId}': ${error}`
      );
    }
  }

  telemetry.report({
    funnel: {
      scanned: lastRun.seedsScanned,
      qualified: lastRun.linksCreated + lastRun.skippedAmbiguous,
      applied: lastRun.linksCreated,
      skipped: lastRun.skippedAmbiguous,
      failed: lastRun.failedGroups,
    },
    stages: [
      {
        name: 'cascade',
        status: 'success',
        durationMs: 0,
        applied: lastRun.cascadeRetargeted,
      },
    ],
    breakdown: [
      { name: 'links_created', count: lastRun.linksCreated },
      { name: 'cascade_retargeted', count: lastRun.cascadeRetargeted },
      { name: 'cascades_blocked', count: lastRun.cascadesBlocked },
    ],
  });

  return {
    ...state,
    lastRun: { ...lastRun },
  };
}
