/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
import type {
  ExceptionListPreDeleteListBlocker,
  ExceptionsListPreDeleteListServerExtension,
} from '@kbn/lists-plugin/server';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { EndpointHttpError } from '../../../endpoint/errors';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';

const REFERENCES_BY_LIST_AGGREGATION = 'referencesByList';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Each bucket counts rule documents (not nested reference entries) that reference the list.
// This shape is constrained by the Saved Objects aggregation validator, which rewrites the
// `alert.references` paths to the root `references` field.
const buildReferencesByListAggregation = (
  listIds: string[],
  referenceType: string
): AggregationsAggregationContainer => ({
  filters: {
    filters: Object.fromEntries(
      listIds.map((listId) => [
        listId,
        {
          bool: {
            filter: [
              {
                nested: {
                  path: 'alert.references',
                  query: {
                    bool: {
                      filter: [
                        { term: { 'alert.references.id': { value: listId } } },
                        { term: { 'alert.references.type': { value: referenceType } } },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ])
    ),
  },
});

// Fail closed: a missing or malformed bucket means the references could not be verified,
// which must never be read as a count of zero.
const getReferenceCountsByListId = (
  aggregations: Record<string, unknown> | undefined,
  listIds: string[]
): Map<string, number> => {
  const aggregation = aggregations?.[REFERENCES_BY_LIST_AGGREGATION];
  const buckets = isRecord(aggregation) ? aggregation.buckets : undefined;

  return new Map(
    listIds.map((listId) => {
      const bucket = isRecord(buckets) && Object.hasOwn(buckets, listId) ? buckets[listId] : null;
      const docCount = isRecord(bucket) ? bucket.doc_count : undefined;

      if (typeof docCount !== 'number' || !Number.isSafeInteger(docCount) || docCount < 0) {
        throw new EndpointHttpError(
          `Unable to verify detection rule references for exception list [${listId}]: unexpected rule search response`,
          500
        );
      }

      return [listId, docCount];
    })
  );
};

// Every list type goes through the rule reference check, including endpoint artifact
// lists (trusted apps, blocklists, etc.). Artifact lists are never referenced by
// detection rules, so the check is a no-op for them; exempting them would require a
// caller-forgeable discriminator and would make the endpoint's behavior non-uniform.
export const getExceptionsPreDeleteListHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreDeleteListServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    if (data.lists.length === 0) {
      return data;
    }

    // Fail closed: without a request there is no way to check whether detection rules
    // reference these lists, and treating "cannot verify" as "not referenced" would allow
    // deleting a list that rules still depend on.
    if (!request) {
      throw new EndpointHttpError(
        'Unable to verify detection rule references for exception lists: no request in context',
        403
      );
    }

    // Fail closed: rule search results are silently filtered to the rule types the
    // caller may read. For a caller without detection rule read access, a zero count
    // means "hidden from you", not "no rule is attached", so refuse instead of trusting it.
    const alertingAuthorization = await endpointAppContextService.getAlertingAuthorization(request);
    const authorizedRuleTypes = await alertingAuthorization.getAllAuthorizedRuleTypesFindOperation({
      authorizationEntity: AlertingAuthorizationEntity.Rule,
      ruleTypeIds: SECURITY_SOLUTION_RULE_TYPE_IDS,
    });

    if (authorizedRuleTypes.size === 0) {
      throw new EndpointHttpError(
        'Unable to verify detection rule references for exception lists: not authorized to read detection rules',
        403
      );
    }

    const listIds = data.lists.map(({ id }) => id);
    const rulesClient = await endpointAppContextService.getRulesClient(request);
    const { aggregations } = await findRules({
      rulesClient,
      perPage: 0,
      page: undefined,
      filter: undefined,
      sortField: undefined,
      sortOrder: undefined,
      aggregations: {
        [REFERENCES_BY_LIST_AGGREGATION]: buildReferencesByListAggregation(
          listIds,
          getSavedObjectType({ namespaceType: data.namespaceType })
        ),
      },
    });

    const referenceCounts = getReferenceCountsByListId(aggregations, listIds);
    const blockedListsById = new Map<string, ExceptionListPreDeleteListBlocker>(
      data.blockedLists.map((block) => [block.id, block])
    );

    referenceCounts.forEach((ruleReferenceCount, listId) => {
      if (ruleReferenceCount > 0 && !blockedListsById.has(listId)) {
        blockedListsById.set(listId, { id: listId });
      }
    });

    return {
      ...data,
      blockedLists: [...blockedListsById.values()],
    };
  };
};
