/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { FactDraft, BriefSignal, EntityRef } from './types';
import { getAlertsIndex } from './shared/indices';
import {
  buildNameLookup,
  entityTypeFromEuid,
  fetchResolutionGroups,
} from './shared/resolution_groups';

const ENTITY_USER_FIELD = 'entity_user';
const ENTITY_HOST_FIELD = 'entity_host';
const MAX_CASES_PER_ENTITY = 10;
const MAX_CASES_BULK = 100;

type CaseStatus = 'open' | 'in-progress' | 'closed';

interface EntityBucket {
  doc_count: number;
  statuses?: { buckets?: Array<{ key: string; doc_count: number }> };
  cases?: { buckets?: Array<{ key: string }> };
}

const toCaseStatus = (status: unknown): CaseStatus =>
  status === 'closed' || status === 'in-progress' ? status : 'open';

const unique = (values: string[]): string[] => [...new Set(values)].sort();

/** Cheap query-level prefilter so the Painless EUID runtime fields only run on candidate alerts. */
const buildPrefilter = (
  memberEuids: string[],
  nameOf: (euid: string) => string
): estypes.QueryDslQueryContainer => {
  const hostNames: string[] = [];
  const hostIds: string[] = [];
  const userNames: string[] = [];
  for (const member of memberEuids) {
    const type = entityTypeFromEuid(member);
    if (type === 'host') {
      hostNames.push(nameOf(member));
      hostIds.push(member.slice(member.indexOf(':') + 1));
    }
    if (type === 'user') {
      userNames.push(nameOf(member));
    }
  }
  return {
    bool: {
      should: [
        { terms: { 'kibana.alert.entity.id': unique(memberEuids) } },
        { terms: { 'host.name': unique(hostNames) } },
        { terms: { 'host.id': unique(hostIds) } },
        { terms: { 'user.name': unique(userNames) } },
      ],
      minimum_should_match: 1,
    },
  } satisfies estypes.QueryDslQueryContainer;
};

/** Matches an alert on any member (golden or alias) of one entity, stamped or derived at search time. */
const buildMembershipQuery = (members: string[]): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { 'kibana.alert.entity.id': members } },
      { terms: { [ENTITY_USER_FIELD]: members } },
      { terms: { [ENTITY_HOST_FIELD]: members } },
    ],
    minimum_should_match: 1,
  },
});

const countByStatus = (bucket: EntityBucket | undefined) => {
  const counts = { open: 0, acknowledged: 0, closed: 0 };
  for (const status of bucket?.statuses?.buckets ?? []) {
    if (status.key === 'closed') {
      counts.closed += status.doc_count;
    } else if (status.key === 'acknowledged' || status.key === 'in-progress') {
      counts.acknowledged += status.doc_count;
    } else {
      counts.open += status.doc_count;
    }
  }
  return counts;
};

/** Alert workflow status per candidate entity, and the cases attached to those alerts. */
export const responseStatusSignal: BriefSignal<'entities'> = {
  id: 'response_status',
  title: 'Response status',
  capability: 'cases',
  scope: 'entities',
  isAvailable: async () => ({ available: true }),
  run: async (ctx, { entities }, abortSignal) => {
    if (entities.length === 0) {
      return { facts: [] };
    }
    const { esClient, spaceId, timeRange, logger } = ctx;
    const { membersOf } = await fetchResolutionGroups({
      esClient,
      spaceId,
      goldenEuids: entities.map(({ euid: goldenEuid }) => goldenEuid),
      abortSignal,
    });
    const nameOf = buildNameLookup(entities);
    const allMembers = unique([...membersOf.values()].flat());

    // One size:0 `filters` aggregation: an alert counts once per entity however many of the
    // entity's aliases it touches.
    const filters: Record<string, estypes.QueryDslQueryContainer> = {};
    entities.forEach((entity, index) => {
      filters[`e${index}`] = buildMembershipQuery(membersOf.get(entity.euid) ?? [entity.euid]);
    });
    const response = await esClient.search(
      {
        index: getAlertsIndex(spaceId),
        size: 0,
        allow_partial_search_results: false,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
              buildPrefilter(allMembers, nameOf),
            ],
            must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
          },
        },
        runtime_mappings: {
          [ENTITY_USER_FIELD]: euid.painless.getEuidRuntimeMapping('user'),
          [ENTITY_HOST_FIELD]: euid.painless.getEuidRuntimeMapping('host'),
        },
        aggs: {
          entities: {
            filters: { filters },
            aggs: {
              statuses: { terms: { field: 'kibana.alert.workflow_status', size: 5 } },
              cases: { terms: { field: 'kibana.alert.case_ids', size: MAX_CASES_PER_ENTITY } },
            },
          },
        },
      },
      { signal: abortSignal }
    );

    const buckets =
      (
        response.aggregations as
          | { entities?: { buckets?: Record<string, EntityBucket> } }
          | undefined
      )?.entities?.buckets ?? {};

    const facts: FactDraft[] = [];
    const entitiesByCase = new Map<string, EntityRef[]>();
    entities.forEach((entity, index) => {
      const bucket = buckets[`e${index}`];
      if (!bucket || bucket.doc_count === 0) {
        return;
      }
      facts.push({
        kind: 'alert_response',
        title: `Alert response for ${entity.name}`,
        entities: [entity],
        numbers: countByStatus(bucket),
      });
      for (const { key } of bucket.cases?.buckets ?? []) {
        const caseId = String(key);
        entitiesByCase.set(caseId, [...(entitiesByCase.get(caseId) ?? []), entity]);
      }
    });

    const caseIds = [...entitiesByCase.keys()].sort().slice(0, MAX_CASES_BULK);
    if (caseIds.length === 0) {
      return { facts };
    }
    const casesClient = await ctx.getCasesClient();
    if (!casesClient) {
      logger.debug('Response status: cases are not available, skipping case facts');
      return { facts };
    }
    try {
      const { cases } = await casesClient.cases.bulkGet({ ids: caseIds });
      for (const entry of cases) {
        facts.push({
          kind: 'case',
          title: entry.title,
          at: entry.created_at,
          entities: entitiesByCase.get(entry.id) ?? [],
          details: { status: toCaseStatus(entry.status) },
          source: { type: 'case', id: entry.id, name: entry.title },
        });
      }
    } catch (error) {
      if (abortSignal.aborted) {
        throw error;
      }
      // Alert status is still valid when the user cannot read cases.
      logger.warn(`Response status: could not read cases: ${(error as Error).message}`);
    }
    return { facts };
  },
};
