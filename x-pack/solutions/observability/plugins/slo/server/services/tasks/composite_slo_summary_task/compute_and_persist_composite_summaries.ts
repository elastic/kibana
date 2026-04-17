/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';
import { ALL_VALUE, compositeSloDefinitionSchema, sloDefinitionSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/Either';
import { merge } from 'lodash';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import type {
  CompositeSLODefinition,
  SLODefinition,
  StoredCompositeSLODefinition,
  StoredSLODefinition,
} from '../../../domain/models';
import type { TimeWindow } from '../../../domain/models/time_window';
import { SO_SLO_COMPOSITE_TYPE } from '../../../saved_objects/slo_composite';
import { SO_SLO_TYPE } from '../../../saved_objects/slo';
import { DefaultBurnRatesClient } from '../../burn_rates_client';
import { DefaultSummaryClient } from '../../summary_client';
import { computeCompositeSummary, type MemberSummaryData } from '../../compute_composite_summary';

type SpaceItems = Array<{ compositeSlo: CompositeSLODefinition }>;
type MemberDefinitionMap = Map<string, SLODefinition>;
type SummaryResult = Awaited<ReturnType<DefaultSummaryClient['computeSummaries']>>[number];
type SummaryResultMap = Map<string, SummaryResult>;

interface Dependencies {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  abortController: AbortController;
}

const COMPOSITE_SLOS_PER_PAGE = 100;
const MAX_COMPOSITE_SLOS = 10_000;

export async function computeAndPersistCompositeSummaries({
  esClient,
  soClient,
  logger,
  abortController,
}: Dependencies): Promise<void> {
  const burnRatesClient = new DefaultBurnRatesClient(esClient);
  const summaryClient = new DefaultSummaryClient(esClient, burnRatesClient);

  let totalProcessed = 0;

  const finder = soClient.createPointInTimeFinder<StoredCompositeSLODefinition>({
    type: SO_SLO_COMPOSITE_TYPE,
    namespaces: ['*'],
    perPage: COMPOSITE_SLOS_PER_PAGE,
  });

  try {
    for await (const response of finder.find()) {
      if (abortController.signal.aborted) {
        logger.debug('Task aborted, stopping');
        break;
      }

      if (response.saved_objects.length === 0) {
        break;
      }

      logger.debug(
        `Processing ${response.saved_objects.length} composite SLOs (${totalProcessed} processed so far)`
      );

      const bySpace = groupBySpace(response.saved_objects, logger);
      const memberMapBySpace = await fetchMemberDefinitions(bySpace, soClient, logger);
      const summaryResultBySpace = await fetchMemberSummaries(
        bySpace,
        memberMapBySpace,
        summaryClient,
        logger
      );
      const bulkOps = buildBulkOps(bySpace, memberMapBySpace, summaryResultBySpace, logger);

      if (bulkOps.length > 0) {
        const bulkResponse = await esClient.bulk(
          { operations: bulkOps, refresh: false },
          { signal: abortController.signal }
        );
        if (bulkResponse.errors) {
          const failed = bulkResponse.items.filter((item) => item.index?.error);
          logger.error(`Bulk upsert had ${failed.length} errors`);
        }
      }

      totalProcessed += response.saved_objects.length;

      if (totalProcessed >= MAX_COMPOSITE_SLOS) {
        logger.debug(`Reached maximum composite SLOs processed (${MAX_COMPOSITE_SLOS}), stopping`);
        break;
      }
    }
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      logger.debug('Task aborted during execution');
      return;
    }
    throw error;
  } finally {
    await finder.close();
  }

  logger.debug(`Composite SLO summary task completed: ${totalProcessed} processed`);
}

function groupBySpace(
  savedObjects: SavedObject<StoredCompositeSLODefinition>[],
  logger: Logger
): Map<string, SpaceItems> {
  const bySpace = new Map<string, SpaceItems>();
  for (const so of savedObjects) {
    const spaceId = so.namespaces?.[0] ?? 'default';
    const compositeSlo = decodeCompositeSLO(so, logger);
    if (!compositeSlo) continue;
    const items = bySpace.get(spaceId) ?? [];
    items.push({ compositeSlo });
    bySpace.set(spaceId, items);
  }
  return bySpace;
}

async function fetchMemberDefinitions(
  bySpace: Map<string, SpaceItems>,
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<Map<string, MemberDefinitionMap>> {
  const memberMapBySpace = new Map<string, MemberDefinitionMap>();
  await Promise.allSettled(
    [...bySpace.entries()].map(async ([spaceId, items]) => {
      const allIds = [
        ...new Set(items.flatMap(({ compositeSlo }) => compositeSlo.members.map((m) => m.sloId))),
      ];
      try {
        const slos = await findMemberSLOs(allIds, spaceId, soClient, logger);
        memberMapBySpace.set(spaceId, new Map(slos.map((slo) => [slo.id, slo])));
      } catch (err) {
        logger.error(
          `Failed to fetch member SLOs for space [${spaceId}]: ${items.length} composite SLOs will not be updated this run: ${err}`
        );
      }
    })
  );
  return memberMapBySpace;
}

async function fetchMemberSummaries(
  bySpace: Map<string, SpaceItems>,
  memberMapBySpace: Map<string, MemberDefinitionMap>,
  summaryClient: DefaultSummaryClient,
  logger: Logger
): Promise<Map<string, SummaryResultMap>> {
  const summaryResultBySpace = new Map<string, SummaryResultMap>();
  await Promise.allSettled(
    [...bySpace.entries()].map(async ([spaceId, items]) => {
      const memberDefinitionMap = memberMapBySpace.get(spaceId);
      if (!memberDefinitionMap) return;

      const seen = new Map<
        string,
        { slo: SLODefinition; instanceId: string; timeWindowOverride: TimeWindow }
      >();
      for (const { compositeSlo } of items) {
        for (const member of compositeSlo.members) {
          const slo = memberDefinitionMap.get(member.sloId);
          if (!slo) continue;
          const instanceId = member.instanceId ?? ALL_VALUE;
          const key = buildMemberSummaryKey(member.sloId, instanceId, compositeSlo.timeWindow);
          if (!seen.has(key)) {
            seen.set(key, { slo, instanceId, timeWindowOverride: compositeSlo.timeWindow });
          }
        }
      }

      if (seen.size === 0) {
        summaryResultBySpace.set(spaceId, new Map());
        return;
      }

      const keys = [...seen.keys()];
      try {
        const results = await summaryClient.computeSummaries([...seen.values()]);
        summaryResultBySpace.set(spaceId, new Map(keys.map((k, i) => [k, results[i]])));
      } catch (err) {
        logger.error(
          `Failed to compute member summaries for space [${spaceId}]: ${items.length} composite SLOs will not be updated this run: ${err}`
        );
      }
    })
  );
  return summaryResultBySpace;
}

function buildBulkOps(
  bySpace: Map<string, SpaceItems>,
  memberMapBySpace: Map<string, MemberDefinitionMap>,
  summaryResultBySpace: Map<string, SummaryResultMap>,
  logger: Logger
): object[] {
  const bulkOps: object[] = [];
  for (const [spaceId, items] of bySpace) {
    const memberDefinitionMap = memberMapBySpace.get(spaceId);
    const summaryResultMap = summaryResultBySpace.get(spaceId);
    if (!memberDefinitionMap || !summaryResultMap) continue;

    for (const { compositeSlo } of items) {
      try {
        const memberSummaries: MemberSummaryData[] = compositeSlo.members.flatMap((member) => {
          const key = buildMemberSummaryKey(
            member.sloId,
            member.instanceId ?? ALL_VALUE,
            compositeSlo.timeWindow
          );
          const slo = memberDefinitionMap.get(member.sloId);
          const result = summaryResultMap.get(key);
          if (!slo || !result) return [];
          return [
            {
              member,
              sloName: slo.name,
              summary: result.summary,
              burnRateWindows: result.burnRateWindows,
            },
          ];
        });

        const { compositeSummary } = computeCompositeSummary(compositeSlo, memberSummaries);
        bulkOps.push({
          index: { _index: COMPOSITE_SUMMARY_INDEX_NAME, _id: `${spaceId}:${compositeSlo.id}` },
        });
        bulkOps.push(buildSummaryDoc(compositeSlo, compositeSummary, spaceId));
      } catch (err) {
        logger.error(
          `Failed to compute summary for composite SLO [${compositeSlo.id}] in space [${spaceId}]: ${err}`
        );
      }
    }
  }
  return bulkOps;
}

function buildMemberSummaryKey(sloId: string, instanceId: string, timeWindow: TimeWindow): string {
  return `${sloId}::${instanceId}::${timeWindow.duration.format()}::${timeWindow.type}`;
}

function decodeCompositeSLO(
  so: SavedObject<StoredCompositeSLODefinition>,
  logger: Logger
): CompositeSLODefinition | undefined {
  const result = compositeSloDefinitionSchema.decode(so.attributes);
  if (isLeft(result)) {
    logger.debug(`Invalid stored composite SLO [${so.attributes.id}], skipping`);
    return undefined;
  }
  return result.right;
}

async function findMemberSLOs(
  ids: string[],
  spaceId: string,
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<SLODefinition[]> {
  if (ids.length === 0) return [];

  // The KQL `field:(a or b or ... or N)` filter translates to a bool/should with N clauses.
  // ES 7+ raised the default bool.max_clause_count to 65536, so the worst-case here
  // (~2500 unique member IDs per page: 100 composites × 25 members, deduplicated) is well
  // within limits. soClient.bulkGet is not an option because SO ids are auto-generated and
  // differ from attributes.id — resolving them would require a find anyway. If performance
  // testing (see ADR-006) shows this query dominating the task budget, consider chunking
  // ids into batches of ≤500 and issuing parallel soClient.find calls.
  const response = await soClient.find<StoredSLODefinition>({
    type: SO_SLO_TYPE,
    namespaces: [spaceId],
    page: 1,
    perPage: ids.length,
    filter: `${SO_SLO_TYPE}.attributes.id:(${ids.map(escapeKuery).join(' or ')})`,
  });

  return response.saved_objects
    .map((so) => decodeStoredSLO(so, logger))
    .filter((slo): slo is SLODefinition => slo !== undefined);
}

function decodeStoredSLO(
  so: SavedObject<StoredSLODefinition>,
  logger: Logger
): SLODefinition | undefined {
  const stored = so.attributes;
  const result = sloDefinitionSchema.decode({
    ...stored,
    groupBy: stored.groupBy ?? ALL_VALUE,
    version: stored.version ?? 1,
    settings: merge(
      { preventInitialBackfill: false, syncDelay: '1m', frequency: '1m' },
      stored.settings
    ),
    createdBy: stored.createdBy ?? so.created_by,
    updatedBy: stored.updatedBy ?? so.updated_by,
    artifacts: { dashboards: [] },
  });

  if (isLeft(result)) {
    logger.debug(`Invalid stored SLO [${stored.id}], skipping`);
    return undefined;
  }

  return result.right;
}

interface CompositeSummaryDoc {
  spaceId: string;
  summaryUpdatedAt: string;
  compositeSlo: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    objective: { target: number };
    timeWindow: { duration: string; type: string };
    budgetingMethod: string;
    createdAt: string;
    updatedAt: string;
  };
  sliValue: number;
  status: string;
  errorBudgetInitial: number;
  errorBudgetConsumed: number;
  errorBudgetRemaining: number;
  errorBudgetIsEstimated: boolean;
  fiveMinuteBurnRate: number;
  oneHourBurnRate: number;
  oneDayBurnRate: number;
}

function buildSummaryDoc(
  compositeSlo: CompositeSLODefinition,
  summary: ReturnType<typeof computeCompositeSummary>['compositeSummary'],
  spaceId: string
): CompositeSummaryDoc {
  return {
    spaceId,
    summaryUpdatedAt: new Date().toISOString(),
    compositeSlo: {
      id: compositeSlo.id,
      name: compositeSlo.name,
      description: compositeSlo.description,
      tags: compositeSlo.tags,
      objective: { target: compositeSlo.objective.target },
      timeWindow: {
        duration: compositeSlo.timeWindow.duration.format(),
        type: compositeSlo.timeWindow.type,
      },
      budgetingMethod: compositeSlo.budgetingMethod,
      createdAt: compositeSlo.createdAt.toISOString(),
      updatedAt: compositeSlo.updatedAt.toISOString(),
    },
    sliValue: summary.sliValue,
    status: summary.status,
    errorBudgetInitial: summary.errorBudget.initial,
    errorBudgetConsumed: summary.errorBudget.consumed,
    errorBudgetRemaining: summary.errorBudget.remaining,
    errorBudgetIsEstimated: summary.errorBudget.isEstimated,
    fiveMinuteBurnRate: summary.fiveMinuteBurnRate,
    oneHourBurnRate: summary.oneHourBurnRate,
    oneDayBurnRate: summary.oneDayBurnRate,
  };
}
