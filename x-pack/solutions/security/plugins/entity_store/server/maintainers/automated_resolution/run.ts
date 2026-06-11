/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AggregationsCompositeAggregate,
  AggregationsCompositeAggregateKey,
  AggregationsCompositeBucket,
  AggregationsFilterAggregate,
  AggregationsMaxAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '../../../common';
import { getFieldValue } from '../../../common/domain/euid/commons';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import type { AutomatedResolutionState, MatchBucket, EntityHit, PerRuleState } from './types';
import type {
  ResolutionRuleConfig,
  SameFieldRuleConfig,
  CrossFieldRuleConfig,
} from './rules_config';
import { cascadeLink } from './cascade';
import { runCrossFieldRule } from './run_cross_field';

const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENTITY_NAMESPACE_FIELD = 'entity.namespace';
const PAGE_SIZE = 10_000;
const TOP_HITS_SIZE = 100;

export interface RunRulesDeps {
  state: AutomatedResolutionState;
  enabledRules: ResolutionRuleConfig[];
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Kept in signature for backwards compatibility; cascade writes bypass it. */
  resolutionClient?: unknown;
  abortController: AbortController;
}

/**
 * Main entry point: iterate over all enabled rules, run each with its own
 * watermark, and accumulate state.  Per-rule try/catch ensures one rule's
 * failure does not abort the others.
 */
export async function runRules(deps: RunRulesDeps): Promise<AutomatedResolutionState> {
  const { state, enabledRules, namespace, esClient, logger, abortController } = deps;
  const index = getLatestEntitiesIndexName(namespace);

  let updatedState: AutomatedResolutionState = { ...state, rules: { ...state.rules } };

  for (const rule of enabledRules) {
    if (abortController.signal.aborted) {
      logger.debug(`Aborted before running rule ${rule.id}`);
      break;
    }

    try {
      const ruleState = updatedState.rules[rule.id] ?? {
        lastProcessedTimestamp: null,
        lastRun: null,
      };

      let newRuleState: PerRuleState;

      if (rule.kind === 'cross_field') {
        newRuleState = await runCrossFieldRule({
          rule: rule as CrossFieldRuleConfig,
          ruleState,
          namespace,
          esClient,
          logger,
          abortController,
        });
      } else {
        newRuleState = await runSameFieldRule({
          rule: rule as SameFieldRuleConfig,
          ruleState,
          index,
          esClient,
          logger,
          abortController,
        });
      }

      updatedState = {
        ...updatedState,
        rules: {
          ...updatedState.rules,
          [rule.id]: newRuleState,
        },
      };
    } catch (err) {
      logger.warn(`Rule ${rule.id} failed with unhandled error: ${(err as Error)?.message ?? err}`);
    }
  }

  return updatedState;
}

interface RunSameFieldRuleDeps {
  rule: SameFieldRuleConfig;
  ruleState: PerRuleState;
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  abortController: AbortController;
}

/**
 * Run a single same-field resolution rule (S1/S2/S3/CF4 pattern).
 * Performs the 4-step collect/group/resolve/watermark cycle for one rule.
 * Uses cascade-retarget when an alias-candidate has incoming aliases.
 */
async function runSameFieldRule({
  rule,
  ruleState,
  index,
  esClient,
  logger,
  abortController,
}: RunSameFieldRuleDeps): Promise<PerRuleState> {
  const {
    matchField,
    entityType,
    namespacePriority,
    namespaceFilter,
    exclusionList,
    matchPattern,
  } = rule;

  // Step 1: Collect new match-field values since watermark
  const collectResult = await collectMatchValues(
    esClient,
    index,
    matchField,
    entityType,
    namespaceFilter,
    exclusionList,
    ruleState
  );
  const { maxTimestamp } = collectResult;
  let { values } = collectResult;

  // Post-filter by matchPattern (avoids Painless regex in ES queries)
  if (matchPattern && values.length > 0) {
    const regex = new RegExp(matchPattern);
    values = values.filter((v) => regex.test(v));
  }

  if (values.length === 0) {
    logger.debug(`Rule ${rule.id}: no new values since watermark, skipping`);
    return {
      ...ruleState,
      lastRun: { resolutionsCreated: 0, skippedAmbiguousBuckets: 0 },
    };
  }

  logger.debug(
    `Rule ${rule.id}: Step 1 collected ${values.length} values, maxTimestamp: ${maxTimestamp}`
  );

  if (abortController.signal.aborted) {
    logger.debug(`Rule ${rule.id}: aborted after Step 1`);
    return ruleState;
  }

  // Step 2: Find matching groups (entities sharing the same match-field value)
  const matchBuckets = await findMatchingGroups(
    esClient,
    index,
    matchField,
    entityType,
    namespaceFilter,
    values,
    logger
  );
  logger.debug(`Rule ${rule.id}: Step 2 found ${matchBuckets.length} match groups`);

  if (abortController.signal.aborted) {
    logger.debug(`Rule ${rule.id}: aborted after Step 2`);
    return ruleState;
  }

  // Step 3: Resolve each bucket with cascade
  const { resolutionsCreated, skippedAmbiguousBuckets, failedBuckets } = await resolveMatchBuckets(
    esClient,
    index,
    matchBuckets,
    namespacePriority,
    rule.id,
    logger
  );

  logger.info(
    `Rule ${rule.id}: ${resolutionsCreated} resolutions created, ${skippedAmbiguousBuckets} ambiguous skipped, ${failedBuckets} failed`
  );

  // Step 4: Advance watermark only when no buckets failed
  return {
    lastProcessedTimestamp: failedBuckets > 0 ? ruleState.lastProcessedTimestamp : maxTimestamp,
    lastRun: { resolutionsCreated, skippedAmbiguousBuckets },
  };
}

async function collectMatchValues(
  esClient: ElasticsearchClient,
  index: string,
  matchField: string,
  entityType: string,
  namespaceFilter: string[] | undefined,
  exclusionList: string[] | undefined,
  ruleState: PerRuleState
): Promise<{ values: string[]; maxTimestamp: string }> {
  const allValues: string[] = [];
  let afterKey: AggregationsCompositeAggregateKey | undefined;
  let maxTimestamp = '';

  const filters: object[] = [
    { term: { [ENGINE_METADATA_TYPE_FIELD]: entityType } },
    { exists: { field: matchField } },
    {
      script: {
        script: { source: `doc['${matchField}'].size() == 1`, lang: 'painless' },
      },
    },
    { bool: { must_not: { exists: { field: RESOLVED_TO_FIELD } } } },
  ];

  if (namespaceFilter && namespaceFilter.length > 0) {
    filters.push({ terms: { [ENTITY_NAMESPACE_FIELD]: namespaceFilter } });
  }

  if (exclusionList && exclusionList.length > 0) {
    filters.push({ bool: { must_not: { terms: { [matchField]: exclusionList } } } });
  }

  if (ruleState.lastProcessedTimestamp) {
    filters.push({
      range: { 'entity.lifecycle.first_seen': { gt: ruleState.lastProcessedTimestamp } },
    });
  }

  do {
    const response = await esClient.search<
      unknown,
      { values: AggregationsCompositeAggregate; max_timestamp: AggregationsMaxAggregate }
    >({
      index,
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        values: {
          composite: {
            sources: [{ value: { terms: { field: matchField } } }],
            size: PAGE_SIZE,
            ...(afterKey ? { after: afterKey } : {}),
          },
        },
        max_timestamp: { max: { field: 'entity.lifecycle.first_seen' } },
      },
    });

    const { aggregations } = response;
    const buckets = (aggregations?.values.buckets ?? []) as AggregationsCompositeBucket[];
    const maxTsAgg = aggregations?.max_timestamp;

    for (const bucket of buckets) {
      allValues.push(bucket.key.value as string);
    }

    if (maxTsAgg?.value_as_string && maxTsAgg.value_as_string > maxTimestamp) {
      maxTimestamp = maxTsAgg.value_as_string;
    }

    afterKey = aggregations?.values.after_key;
  } while (afterKey);

  return { values: allValues, maxTimestamp };
}

async function findMatchingGroups(
  esClient: ElasticsearchClient,
  index: string,
  matchField: string,
  entityType: string,
  namespaceFilter: string[] | undefined,
  values: string[],
  logger: Logger
): Promise<MatchBucket[]> {
  const allBuckets: MatchBucket[] = [];

  for (let i = 0; i < values.length; i += PAGE_SIZE) {
    const batch = values.slice(i, i + PAGE_SIZE);

    const baseFilters: object[] = [
      { term: { [ENGINE_METADATA_TYPE_FIELD]: entityType } },
      { terms: { [matchField]: batch } },
      {
        script: {
          script: { source: `doc['${matchField}'].size() == 1`, lang: 'painless' },
        },
      },
    ];

    if (namespaceFilter && namespaceFilter.length > 0) {
      baseFilters.push({ terms: { [ENTITY_NAMESPACE_FIELD]: namespaceFilter } });
    }

    const response = await esClient.search<
      unknown,
      { match_groups: AggregationsStringTermsAggregate }
    >({
      index,
      size: 0,
      query: { bool: { filter: baseFilters } },
      aggs: {
        match_groups: {
          terms: { field: matchField, min_doc_count: 2, size: PAGE_SIZE },
          aggs: {
            unresolved: {
              filter: { bool: { must_not: { exists: { field: RESOLVED_TO_FIELD } } } },
              aggs: {
                hits: {
                  top_hits: {
                    size: TOP_HITS_SIZE,
                    _source: [ENTITY_ID_FIELD, ENTITY_NAMESPACE_FIELD],
                  },
                },
              },
            },
            existing_targets: {
              filter: { exists: { field: RESOLVED_TO_FIELD } },
              aggs: {
                target_ids: { terms: { field: RESOLVED_TO_FIELD, size: PAGE_SIZE } },
              },
            },
          },
        },
      },
    });

    const groupBuckets = (response.aggregations?.match_groups.buckets ??
      []) as AggregationsStringTermsBucket[];

    for (const bucket of groupBuckets) {
      const unresolvedFilter = bucket.unresolved as AggregationsFilterAggregate;
      const unresolvedTopHits = unresolvedFilter.hits as AggregationsTopHitsAggregate;

      const totalUnresolved =
        typeof unresolvedTopHits.hits.total === 'number'
          ? unresolvedTopHits.hits.total
          : unresolvedTopHits.hits.total?.value ?? 0;

      if (totalUnresolved > TOP_HITS_SIZE) {
        logger.warn(
          `Match bucket '${
            bucket.key
          }' has ${totalUnresolved} unresolved entities but top_hits capped at ${TOP_HITS_SIZE}; ${
            totalUnresolved - TOP_HITS_SIZE
          } entities skipped`
        );
      }

      const unresolvedEntities: EntityHit[] = unresolvedTopHits.hits.hits.map((hit) => ({
        entityId: getFieldValue(hit._source, ENTITY_ID_FIELD) ?? '',
        namespace: getFieldValue(hit._source, ENTITY_NAMESPACE_FIELD) ?? '',
      }));

      const existingTargetsFilter = bucket.existing_targets as AggregationsFilterAggregate;
      const targetIdsTerms = existingTargetsFilter.target_ids as AggregationsStringTermsAggregate;
      const targetBuckets = (targetIdsTerms.buckets ?? []) as AggregationsStringTermsBucket[];
      const existingTargetIds: string[] = targetBuckets.map((tb) => `${tb.key}`);

      allBuckets.push({
        matchValue: `${bucket.key}`,
        unresolvedEntities,
        existingTargetIds,
      });
    }
  }

  return allBuckets;
}

async function resolveMatchBuckets(
  esClient: ElasticsearchClient,
  index: string,
  buckets: MatchBucket[],
  namespacePriority: string[],
  ruleId: string,
  logger: Logger
): Promise<{ resolutionsCreated: number; skippedAmbiguousBuckets: number; failedBuckets: number }> {
  let resolutionsCreated = 0;
  let skippedAmbiguousBuckets = 0;
  let failedBuckets = 0;

  for (const bucket of buckets) {
    try {
      const { existingTargetIds, unresolvedEntities } = bucket;

      if (existingTargetIds.length > 1) {
        logger.warn(
          `Skipping ambiguous bucket: ${existingTargetIds.length} existing targets for the same match value`
        );
        skippedAmbiguousBuckets++;
        continue;
      }

      let targetId: string;
      let aliasIds: string[];

      if (existingTargetIds.length === 1) {
        targetId = existingTargetIds[0];
        aliasIds = unresolvedEntities.filter((e) => e.entityId !== targetId).map((e) => e.entityId);
      } else if (unresolvedEntities.length >= 2) {
        const targetEntity = selectTarget(unresolvedEntities, namespacePriority);
        targetId = targetEntity.entityId;
        aliasIds = unresolvedEntities.filter((e) => e.entityId !== targetId).map((e) => e.entityId);
      } else {
        continue;
      }

      if (aliasIds.length === 0) continue;

      // Use cascade link — handles entities that have incoming aliases
      const result = await cascadeLink(esClient, index, targetId, aliasIds, logger);

      if (result.cycleBlocked) {
        logger.warn(`Rule ${ruleId}: cycle blocked for target ${targetId}`);
        skippedAmbiguousBuckets++;
      } else {
        resolutionsCreated += result.resolutionsCreated;
        if (result.cascadeCount > 0) {
          logger.debug(
            `Rule ${ruleId}: cascade retargeted ${result.cascadeCount} entities → ${targetId}`
          );
        }
      }
    } catch (err) {
      failedBuckets++;
      logger.warn(`Failed to resolve bucket: ${(err as Error)?.message ?? err}`);
    }
  }

  return { resolutionsCreated, skippedAmbiguousBuckets, failedBuckets };
}

/**
 * Target selection: prefer entities from the rule's `namespacePriority` list
 * (in order), with alphabetical entity.id as a tiebreaker.
 * Per-rule priority — not a global list (POC-1 caveat 2).
 */
export function selectTarget(entities: EntityHit[], namespacePriority: string[]): EntityHit {
  for (const ns of namespacePriority) {
    const candidates = entities.filter((e) => e.namespace === ns);
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.entityId.localeCompare(b.entityId));
      return candidates[0];
    }
  }
  const sorted = [...entities].sort((a, b) => a.entityId.localeCompare(b.entityId));
  return sorted[0];
}
