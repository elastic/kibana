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
import { SO_SLO_COMPOSITE_TYPE } from '../../../saved_objects/slo_composite';
import { SO_SLO_TYPE } from '../../../saved_objects/slo';
import { DefaultBurnRatesClient } from '../../burn_rates_client';
import { DefaultSummaryClient } from '../../summary_client';
import { computeCompositeSummary, type MemberSummaryData } from '../../compute_composite_summary';

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

      const bulkOps: object[] = [];

      for (const so of response.saved_objects) {
        const spaceId = so.namespaces?.[0] ?? 'default';
        const compositeSlo = decodeCompositeSLO(so, logger);
        if (!compositeSlo) continue;

        const persisted = await computeCompositeSummaryDocument({
          summaryClient,
          soClient,
          logger,
          spaceId,
          compositeSlo,
        });
        if (persisted) {
          bulkOps.push({
            index: { _index: COMPOSITE_SUMMARY_INDEX_NAME, _id: persisted.docId },
          });
          bulkOps.push(persisted.doc);
        }
      }

      if (bulkOps.length > 0) {
        const bulkResponse = await esClient.bulk(
          { operations: bulkOps, refresh: false },
          { signal: abortController.signal }
        );
        if (bulkResponse.errors) {
          const failed = bulkResponse.items.filter((item) => item.index?.error);
          logger.debug(`Bulk upsert had ${failed.length} errors`);
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

async function computeCompositeSummaryDocument({
  summaryClient,
  soClient,
  logger,
  spaceId,
  compositeSlo,
}: {
  summaryClient: InstanceType<typeof DefaultSummaryClient>;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  spaceId: string;
  compositeSlo: CompositeSLODefinition;
}): Promise<{ docId: string; doc: CompositeSummaryDoc } | null> {
  try {
    const existingMemberSlos = await findMemberSLOs(
      compositeSlo.members.map((m) => m.sloId),
      spaceId,
      soClient,
      logger
    );

    const memberDefinitionMap = new Map(existingMemberSlos.map((slo) => [slo.id, slo]));
    const activeMembers = compositeSlo.members.filter((m) => memberDefinitionMap.has(m.sloId));

    const summaryParams = activeMembers.map((member) => ({
      slo: memberDefinitionMap.get(member.sloId)!,
      instanceId: member.instanceId ?? ALL_VALUE,
      timeWindowOverride: compositeSlo.timeWindow,
    }));

    const summaryResults = await summaryClient.computeSummaries(summaryParams);

    const memberSummaries: MemberSummaryData[] = activeMembers.map((member, i) => ({
      member,
      sloName: memberDefinitionMap.get(member.sloId)!.name,
      summary: summaryResults[i].summary,
      burnRateWindows: summaryResults[i].burnRateWindows,
    }));

    const { compositeSummary } = computeCompositeSummary(compositeSlo, memberSummaries);

    const docId = `${spaceId}:${compositeSlo.id}`;
    const doc = buildSummaryDoc(compositeSlo, compositeSummary, spaceId);

    return { docId, doc };
  } catch (err) {
    logger.debug(
      `Failed to compute summary for composite SLO [${compositeSlo.id}] in space [${spaceId}]: ${err}`
    );
    return null;
  }
}

export async function computeAndPersistSingleCompositeSummary({
  esClient,
  soClient,
  logger,
  spaceId,
  compositeSlo,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  spaceId: string;
  compositeSlo: CompositeSLODefinition;
}): Promise<void> {
  const burnRatesClient = new DefaultBurnRatesClient(esClient);
  const summaryClient = new DefaultSummaryClient(esClient, burnRatesClient);

  const computed = await computeCompositeSummaryDocument({
    summaryClient,
    soClient,
    logger,
    spaceId,
    compositeSlo,
  });

  if (!computed) {
    return;
  }

  try {
    await esClient.index({
      index: COMPOSITE_SUMMARY_INDEX_NAME,
      id: computed.docId,
      document: computed.doc,
      refresh: true,
    });
  } catch (err) {
    logger.warn(
      `Failed to persist composite SLO summary for [${compositeSlo.id}] in space [${spaceId}]: ${err}`
    );
  }
}
