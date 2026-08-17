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

const ENDPOINT_EXCEPTION_LIST_TYPES = new Set([
  'endpoint',
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
    type: savedObjectType,
    id: list.id,
  }));

  const { saved_objects: rules } = await savedObjectsClient.find<{
    name: string;
    params: { ruleId?: string };
  }>({
    type: RULE_SAVED_OBJECT_TYPE,
    hasReference,
    hasReferenceOperator: 'OR',
    perPage: 10000,
  });

  const listIdSet = new Set(lists.map((l) => l.id));
  const listToRules = new Map<string, RuleReference[]>();

  for (const rule of rules) {
    const ruleRef: RuleReference = {
      rule_id: rule.attributes.params?.ruleId ?? rule.id,
      id: rule.id,
      name: rule.attributes.name,
    };

    for (const ref of rule.references) {
      if (ref.type === savedObjectType && listIdSet.has(ref.id)) {
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
        message,
        status_code: statusCode,
        lists: [{ id: list.id, list_id: list.list_id }],
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
        message,
        status_code: statusCode,
        lists: [{ id: list.id, list_id: list.list_id }],
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
      success: true,
      results: [],
      errors: [],
      summary: { total: 0, succeeded: 0, failed: 0, skipped: skippedCount },
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
        message:
          savedObject.error.statusCode === 404
            ? getErrorMessageExceptionList({ id, listId: undefined })
            : savedObject.error.message,
        status_code: savedObject.error.statusCode ?? 500,
        lists: [{ id }],
      });
    } else if (savedObject.attributes.list_type !== 'list') {
      validationErrors.push({
        message: getErrorMessageExceptionList({ id, listId: undefined }),
        status_code: 404,
        lists: [{ id }],
      });
    } else {
      foundLists.push(transformSavedObjectToExceptionList({ savedObject }));
    }
  });

  if (foundLists.length === 0) {
    return {
      success: validationErrors.length === 0,
      results: [],
      errors: validationErrors,
      summary: {
        total: uniqueIds.length,
        succeeded: 0,
        failed: validationErrors.length,
        skipped: skippedCount,
      },
    };
  }

  // Separate endpoint-type lists (no rule references possible) from checkable lists
  const endpointLists: ExceptionListSchema[] = [];
  const checkableLists: ExceptionListSchema[] = [];
  for (const list of foundLists) {
    if (ENDPOINT_EXCEPTION_LIST_TYPES.has(list.type)) {
      endpointLists.push(list);
    } else {
      checkableLists.push(list);
    }
  }

  // Check rule references for non-endpoint lists
  const listToRules = await findRuleReferences({
    lists: checkableLists,
    savedObjectsClient,
    savedObjectType,
  });

  const referenceErrors: BulkDeleteExceptionListError[] = [];
  const deletableLists: ExceptionListSchema[] = [...endpointLists];

  for (const list of checkableLists) {
    const rules = listToRules.get(list.id);
    if (rules && rules.length > 0) {
      referenceErrors.push({
        message: `Exception list "${list.name}" cannot be deleted because it is linked to ${
          rules.length
        } ${
          rules.length === 1 ? 'rule' : 'rules'
        }. Unlink the list from all rules before retrying.`,
        status_code: 409,
        lists: [{ id: list.id, list_id: list.list_id }],
        rule_references: rules,
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
    success: allErrors.length === 0,
    results,
    errors: allErrors,
    summary: {
      total: uniqueIds.length,
      succeeded: results.length,
      failed: allErrors.length,
      skipped: skippedCount,
    },
  };
};
