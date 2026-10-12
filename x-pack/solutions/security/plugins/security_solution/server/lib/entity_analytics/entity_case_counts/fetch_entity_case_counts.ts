/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { ISavedObjectsRepository, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/types';
import { nodeBuilder } from '@kbn/es-query';
import { CaseStatuses } from '@kbn/cases-components';
import { SECURITY_ENTITY_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import type { CasesClient } from '@kbn/cases-plugin/server';

/** The hidden saved object type of unified case attachments (not exported by the plugin). */
export const CASE_ATTACHMENT_TYPE = 'cases-attachments';

const ATTRIBUTES = `${CASE_ATTACHMENT_TYPE}.attributes`;
const REFERENCES = `${CASE_ATTACHMENT_TYPE}.references`;

/** The most ids the Cases client gets at once (its `MAX_BULK_GET_CASES`). */
const MAX_BULK_GET_CASES = 1000;

/** The most cases read per entity; an entity in more cases counts this many. */
const MAX_CASES_PER_ENTITY = 1000;

type EntityCaseBucket = AggregationsStringTermsBucket & {
  references: {
    cases: AggregationsStringTermsAggregate & { buckets: AggregationsStringTermsBucket[] };
  };
};

interface CaseAggs {
  by_entity: AggregationsStringTermsAggregate & { buckets: EntityCaseBucket[] };
}

/**
 * Whether the user may read Security cases' attachments. Cases grants no saved object access
 * to its types: it checks this privilege itself and reads with an internal client, as we do.
 */
export const canReadSecurityCases = async (
  security: SecurityPluginStart,
  request: KibanaRequest
): Promise<boolean> => {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { hasAllRequested } = await checkPrivileges({
    kibana: [security.authz.actions.cases.get(SECURITY_SOLUTION_OWNER, 'getComment')],
  });
  return hasAllRequested;
};

/**
 * The cases of the space per entity id: the distinct cases with a `security.entity` attachment
 * of the entity. Check `canReadSecurityCases` first: the repository is internal.
 */
const fetchCaseIdsByEntity = async (
  internalRepository: ISavedObjectsRepository,
  spaceId: string,
  entityIds: readonly string[]
): Promise<Map<string, string[]>> => {
  const result = await internalRepository.find<unknown, CaseAggs>({
    type: CASE_ATTACHMENT_TYPE,
    namespaces: [spaceId],
    perPage: 1,
    filter: nodeBuilder.and([
      nodeBuilder.is(`${ATTRIBUTES}.type`, SECURITY_ENTITY_ATTACHMENT_TYPE),
      nodeBuilder.is(`${ATTRIBUTES}.owner`, SECURITY_SOLUTION_OWNER),
      nodeBuilder.or(entityIds.map((id) => nodeBuilder.is(`${ATTRIBUTES}.attachmentId`, id))),
    ]),
    aggs: {
      by_entity: {
        terms: { field: `${ATTRIBUTES}.attachmentId`, size: entityIds.length },
        aggs: {
          // An attachment references its case; an entity attached twice to a case counts once.
          references: {
            nested: { path: REFERENCES },
            aggs: { cases: { terms: { field: `${REFERENCES}.id`, size: MAX_CASES_PER_ENTITY } } },
          },
        },
      },
    },
  });

  return new Map(
    (result.aggregations?.by_entity.buckets ?? []).map((bucket) => [
      String(bucket.key),
      bucket.references.cases.buckets.map(({ key }) => String(key)),
    ])
  );
};

/** The ids of the cases that are not closed: open or in progress. */
const fetchUnclosedCaseIds = async (
  casesClient: CasesClient,
  caseIds: readonly string[]
): Promise<Set<string>> => {
  const batches = await Promise.all(
    chunk(caseIds, MAX_BULK_GET_CASES).map((ids) => casesClient.cases.bulkGet({ ids }))
  );
  return new Set(
    batches
      .flatMap(({ cases }) => cases)
      .filter(({ status }) => status !== CaseStatuses.closed)
      .map(({ id }) => id)
  );
};

/**
 * The open and in-progress Security cases of the space per entity id. Entities without such
 * cases are left out. Check `canReadSecurityCases` first: the repository is internal.
 */
export const fetchEntityCaseCounts = async (
  internalRepository: ISavedObjectsRepository,
  casesClient: CasesClient,
  spaceId: string,
  entityIds: readonly string[]
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();
  const caseIdsByEntity = await fetchCaseIdsByEntity(internalRepository, spaceId, entityIds);
  const unclosed = await fetchUnclosedCaseIds(casesClient, [
    ...new Set([...caseIdsByEntity.values()].flat()),
  ]);
  return new Map(
    [...caseIdsByEntity].flatMap(([entityId, caseIds]) => {
      const count = caseIds.filter((id) => unclosed.has(id)).length;
      return count > 0 ? [[entityId, count] as const] : [];
    })
  );
};
