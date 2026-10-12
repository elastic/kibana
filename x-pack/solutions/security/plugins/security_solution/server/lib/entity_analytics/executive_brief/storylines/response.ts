/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type {
  BriefTimeRange,
  StoryCaseRef,
  StoryResponse,
} from '../../../../../common/entity_analytics/executive_brief/types';
import {
  asBucketArray,
  buildAlertScopeFilter,
  buildEntityMembershipQuery,
  buildEntityRefs,
  buildEntityRuntimeMappings,
  getAlertsIndex,
} from './alert_queries';
import { deriveResponseState } from './cluster';
import type { EvidenceRegistry } from '../snapshot/evidence_registry';

const MAX_CASES_PER_STORYLINE = 10;
const MAX_CASES_BULK = 100;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface ResponseGroup {
  /** Component key. */
  key: string;
  /** Golden + alias euids of the storyline's entities. */
  euids: string[];
}

export interface RawResponse {
  alerts: StoryResponse['alerts'];
  /** Cases attached to the storyline's alerts, sorted. */
  caseIds: string[];
  /** ISO timestamp of the latest closing, when any alert is closed. */
  closedAt?: string;
}

export interface CaseDetails {
  caseId: string;
  title: string;
  status: StoryCaseRef['status'];
  createdAt: string;
  updatedAt?: string;
}

interface GroupBucket {
  doc_count: number;
  statuses?: { buckets?: Array<{ key: string; doc_count: number }> };
  cases?: { buckets?: Array<{ key: string }> };
  closed?: { closed_at?: { value_as_string?: string } };
}

/**
 * Alert workflow status and case ids per storyline, from one size:0 `filters` aggregation: an
 * alert counts once per storyline however many of its entities it touches.
 */
export const fetchRawResponses = async ({
  esClient,
  spaceId,
  timeRange,
  groups,
  nameOf,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  timeRange: BriefTimeRange;
  groups: ResponseGroup[];
  nameOf: (euid: string) => string;
  signal?: AbortSignal;
}): Promise<Record<string, RawResponse>> => {
  if (groups.length === 0) {
    return {};
  }
  const refs = buildEntityRefs(
    groups.flatMap((group) => group.euids.map((euid) => ({ euid, name: nameOf(euid) })))
  );
  const filters: Record<string, estypes.QueryDslQueryContainer> = {};
  groups.forEach((group, index) => {
    filters[`g${index}`] = buildEntityMembershipQuery(group.euids);
  });

  const response = await esClient.search<unknown>(
    {
      index: getAlertsIndex(spaceId),
      size: 0,
      allow_partial_search_results: false,
      query: buildAlertScopeFilter(timeRange, refs),
      runtime_mappings: buildEntityRuntimeMappings(),
      aggs: {
        groups: {
          filters: { filters },
          aggs: {
            statuses: { terms: { field: 'kibana.alert.workflow_status', size: 5 } },
            cases: { terms: { field: 'kibana.alert.case_ids', size: MAX_CASES_PER_STORYLINE } },
            closed: {
              filter: { term: { 'kibana.alert.workflow_status': 'closed' } },
              aggs: { closed_at: { max: { field: 'kibana.alert.workflow_status_updated_at' } } },
            },
          },
        },
      },
    },
    { signal }
  );

  const buckets =
    (
      (response.aggregations as Record<string, unknown> | undefined)?.groups as {
        buckets?: Record<string, GroupBucket>;
      }
    )?.buckets ?? {};
  const result: Record<string, RawResponse> = {};
  groups.forEach((group, index) => {
    const bucket = buckets[`g${index}`];
    const alerts = { open: 0, acknowledged: 0, closed: 0 };
    for (const status of bucket?.statuses?.buckets ?? []) {
      if (status.key === 'closed') alerts.closed += status.doc_count;
      else if (status.key === 'acknowledged' || status.key === 'in-progress')
        alerts.acknowledged += status.doc_count;
      else alerts.open += status.doc_count;
    }
    result[group.key] = {
      alerts,
      caseIds: asBucketArray<{ key: string }>(bucket?.cases)
        .map((entry) => String(entry.key))
        .sort(compare),
      closedAt: alerts.closed > 0 ? bucket?.closed?.closed_at?.value_as_string : undefined,
    };
  });
  return result;
};

const toCaseStatus = (status: unknown): StoryCaseRef['status'] =>
  status === 'closed' || status === 'in-progress' ? status : 'open';

/** One `casesClient.cases.bulkGet` for every case id of every storyline. */
export const fetchCaseDetails = async ({
  casesClient,
  caseIds,
}: {
  casesClient: CasesClient;
  caseIds: string[];
}): Promise<Map<string, CaseDetails>> => {
  const ids = [...new Set(caseIds)].sort(compare).slice(0, MAX_CASES_BULK);
  const details = new Map<string, CaseDetails>();
  if (ids.length === 0) {
    return details;
  }
  const { cases } = await casesClient.cases.bulkGet({ ids });
  for (const entry of cases) {
    details.set(entry.id, {
      caseId: entry.id,
      title: entry.title,
      status: toCaseStatus(entry.status),
      createdAt: entry.created_at,
      updatedAt: entry.closed_at ?? entry.updated_at ?? undefined,
    });
  }
  return details;
};

/**
 * Response state without touching the registry (used for ranking). Cases whose details could not
 * be read are not counted: the state then rests on alert statuses alone, and the cases source
 * carries the error.
 */
export const assessResponse = (
  raw: RawResponse | undefined,
  caseDetails: ReadonlyMap<string, CaseDetails>
): StoryResponse => {
  const alerts = raw?.alerts ?? { open: 0, acknowledged: 0, closed: 0 };
  const cases: StoryCaseRef[] = (raw?.caseIds ?? []).flatMap((caseId) => {
    const detail = caseDetails.get(caseId);
    return detail
      ? [
          {
            evidenceId: `CASE-${caseId}` as const,
            caseId,
            title: detail.title,
            status: detail.status,
          },
        ]
      : [];
  });
  return { state: deriveResponseState(alerts, cases), cases: [], alerts };
};

/** Final response with registered CASE ids, for a storyline that survived ranking. */
export const registerResponse = (
  raw: RawResponse | undefined,
  caseDetails: ReadonlyMap<string, CaseDetails>,
  registry: EvidenceRegistry
): StoryResponse => {
  const alerts = raw?.alerts ?? { open: 0, acknowledged: 0, closed: 0 };
  const cases: StoryCaseRef[] = (raw?.caseIds ?? []).flatMap((caseId) => {
    const detail = caseDetails.get(caseId);
    if (!detail) return [];
    return [
      {
        evidenceId: registry.case({
          kind: 'case',
          caseId,
          title: detail.title,
          status: detail.status,
        }),
        caseId,
        title: detail.title,
        status: detail.status,
      },
    ];
  });
  return { state: deriveResponseState(alerts, cases), cases, alerts };
};
