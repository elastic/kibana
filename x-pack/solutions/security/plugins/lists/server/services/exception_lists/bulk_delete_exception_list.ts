/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ExceptionListSchema,
  Id,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { SavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';
import { getErrorMessageExceptionList } from '../../routes/utils/get_error_message_exception_list';

import { deleteExceptionListItemsByListStreamed } from './delete_exception_list_items_by_list';
import { transformSavedObjectToExceptionList } from './utils';

interface BulkDeleteExceptionListOptions {
  ids: Id[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface BulkDeleteExceptionListError {
  message: string;
  status_code: number;
  lists: Array<{ id: string; list_id?: string }>;
  rule_references?: Array<{ rule_id: string; id: string; name: string }>;
}

export interface BulkDeleteExceptionListResult {
  success: boolean;
  results: ExceptionListSchema[];
  errors: BulkDeleteExceptionListError[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

const BULK_DELETE_LIST_CONCURRENCY = 10;

const RULE_SAVED_OBJECT_TYPE = 'alert';

// Detection rules are alerting rules with the security solution consumer. We scope
// the reference query to this consumer so non-detection alerting rules (which never
// hold exception-list references in practice) can't leak into the results.
const SECURITY_SOLUTION_RULE_CONSUMER = 'siem';

// Endpoint artifact lists (trusted apps, blocklists, etc.) are pushed to endpoints
// via policy and are never referenced by detection rules, so they skip the rule
// reference check. Note: the plain `endpoint` type is deliberately NOT in this set
// -- the Elastic Endpoint exceptions list CAN be attached to detection rules, so it
// must go through the reference check like any other detection list.
const ENDPOINT_ARTIFACT_EXCEPTION_LIST_TYPES = new Set([
  'endpoint_trusted_apps',
  'endpoint_trusted_devices',
  'endpoint_events',
  'endpoint_host_isolation_exceptions',
  'endpoint_blocklists',
  'endpoint_custom_yara_signatures',
]);

interface RuleReference {
  rule_id: string;
  id: string;
  name: string;
}

const findRuleReferences = async ({
  lists,
  savedObjectsClient,
  savedObjectType,
}: {
  lists: ExceptionListSchema[];
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: SavedObjectType;
}): Promise<Map<string, RuleReference[]>> => {
  if (lists.length === 0) {
    return new Map();
  }

  const hasReference = lists.map((list) => ({
    id: list.id,
    type: savedObjectType,
  }));

  // NOTE: This reference check lives in the lists plugin (rather than delegating to
  // security_solution's rulesClient/`_find_references`) to avoid a lists -> security_solution
  // dependency. As a consequence we query the raw `alert` saved object directly and scope
  // it to the security solution consumer so only detection rules are considered.
  const { saved_objects: rules } = await savedObjectsClient.find<{
    name: string;
    params: { ruleId: string };
  }>({
    filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.consumer: ${SECURITY_SOLUTION_RULE_CONSUMER}`,
    hasReference,
    hasReferenceOperator: 'OR',
    perPage: 10000,
    type: RULE_SAVED_OBJECT_TYPE,
  });

  const listIdSet = new Set(lists.map((l) => l.id));
  const listToRules = new Map<string, RuleReference[]>();

  for (const rule of rules) {
    const ruleRef: RuleReference = {
      id: rule.id,
      name: rule.attributes.name,
      rule_id: rule.attributes.params.ruleId,
    };

    // A rule can carry the same list id in more than one reference entry; only
    // record it once per list so the reference count isn't inflated.
    const seenListIds = new Set<string>();
    for (const ref of rule.references) {
      if (ref.type === savedObjectType && listIdSet.has(ref.id) && !seenListIds.has(ref.id)) {
        seenListIds.add(ref.id);
        const existing = listToRules.get(ref.id) ?? [];
        existing.push(ruleRef);
        listToRules.set(ref.id, existing);
      }
    }
  }

  return listToRules;
};

const deleteListWithItems = async ({
  list,
  namespaceType,
  savedObjectsClient,
  savedObjectType,
}: {
  list: ExceptionListSchema;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: SavedObjectType;
}): Promise<{ list: ExceptionListSchema; error?: BulkDeleteExceptionListError }> => {
  try {
    await deleteExceptionListItemsByListStreamed({
      listId: list.list_id,
      namespaceType,
      savedObjectsClient,
    });
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: {
        lists: [{ id: list.id, list_id: list.list_id }],
        message,
        status_code: statusCode,
      },
      list,
    };
  }

  try {
    await savedObjectsClient.delete(savedObjectType, list.id);
    return { list };
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: {
        lists: [{ id: list.id, list_id: list.list_id }],
        message,
        status_code: statusCode,
      },
      list,
    };
  }
};

export const bulkDeleteExceptionList = async ({
  ids,
  namespaceType,
  savedObjectsClient,
}: BulkDeleteExceptionListOptions): Promise<BulkDeleteExceptionListResult> => {
  const uniqueIds = [...new Set(ids)];
  const skippedCount = ids.length - uniqueIds.length;

  if (uniqueIds.length === 0) {
    return {
      errors: [],
      results: [],
      success: true,
      summary: { failed: 0, skipped: skippedCount, succeeded: 0, total: 0 },
    };
  }

  const savedObjectType = getSavedObjectType({ namespaceType });

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet<ExceptionListSoSchema>(
    uniqueIds.map((id) => ({ id, type: savedObjectType }))
  );

  const validationErrors: BulkDeleteExceptionListError[] = [];
  const foundLists: ExceptionListSchema[] = [];

  savedObjects.forEach((savedObject, index) => {
    const id = uniqueIds[index];
    if (isSavedObjectErrorResult(savedObject)) {
      validationErrors.push({
        lists: [{ id }],
        message:
          savedObject.error.statusCode === 404
            ? getErrorMessageExceptionList({ id, listId: undefined })
            : savedObject.error.message,
        status_code: savedObject.error.statusCode ?? 500,
      });
    } else if (savedObject.attributes.list_type !== 'list') {
      validationErrors.push({
        lists: [{ id }],
        message: getErrorMessageExceptionList({ id, listId: undefined }),
        status_code: 404,
      });
    } else {
      foundLists.push(transformSavedObjectToExceptionList({ savedObject }));
    }
  });

  if (foundLists.length === 0) {
    return {
      errors: validationErrors,
      results: [],
      success: validationErrors.length === 0,
      summary: {
        failed: validationErrors.length,
        skipped: skippedCount,
        succeeded: 0,
        total: uniqueIds.length,
      },
    };
  }

  // Endpoint artifact lists are pushed to endpoints via policy and are never
  // referenced by detection rules, so they skip the rule reference check. Every
  // other type (including the plain `endpoint` list, which can be attached to
  // rules) is checked for rule references before deletion.
  const endpointArtifactLists: ExceptionListSchema[] = [];
  const checkableLists: ExceptionListSchema[] = [];
  for (const list of foundLists) {
    if (ENDPOINT_ARTIFACT_EXCEPTION_LIST_TYPES.has(list.type)) {
      endpointArtifactLists.push(list);
    } else {
      checkableLists.push(list);
    }
  }

  // Check rule references for all non-endpoint-artifact lists
  const listToRules = await findRuleReferences({
    lists: checkableLists,
    savedObjectType,
    savedObjectsClient,
  });

  const referenceErrors: BulkDeleteExceptionListError[] = [];
  const deletableLists: ExceptionListSchema[] = [...endpointArtifactLists];

  for (const list of checkableLists) {
    const rules = listToRules.get(list.id);
    if (rules && rules.length > 0) {
      referenceErrors.push({
        lists: [{ id: list.id, list_id: list.list_id }],
        message: `Exception list "${list.name}" cannot be deleted because it is linked to ${
          rules.length
        } ${
          rules.length === 1 ? 'rule' : 'rules'
        }. Unlink the list from all rules before retrying.`,
        rule_references: rules,
        status_code: 409,
      });
    } else {
      deletableLists.push(list);
    }
  }

  // Delete lists that passed both validation and reference checks
  const deleteResults =
    deletableLists.length > 0
      ? await pMap(
          deletableLists,
          (list) =>
            deleteListWithItems({ list, namespaceType, savedObjectType, savedObjectsClient }),
          { concurrency: BULK_DELETE_LIST_CONCURRENCY }
        )
      : [];

  const results: ExceptionListSchema[] = [];
  const deleteErrors: BulkDeleteExceptionListError[] = [];

  deleteResults.forEach(({ list, error }) => {
    if (error) {
      deleteErrors.push(error);
    } else {
      results.push(list);
    }
  });

  const allErrors = [...validationErrors, ...referenceErrors, ...deleteErrors];

  return {
    errors: allErrors,
    results,
    success: allErrors.length === 0,
    summary: {
      failed: allErrors.length,
      skipped: skippedCount,
      succeeded: results.length,
      total: uniqueIds.length,
    },
  };
};
