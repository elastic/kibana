/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { ExceptionListItem } from '@kbn/securitysolution-exceptions-common/api';
import type {
  CreateExceptionListItemSchema,
  EntriesArray,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { CREATE_RULE_EXCEPTIONS_URL } from '../../../common/api/detection_engine/rule_exceptions';
import { DETECTION_ENGINE_RULES_URL } from '../../../common/constants';
import { RuleExceptionList } from '../../../common/api/detection_engine/model/rule_schema';
import { assertUnreachable } from '../../../common/utility_types';
import type {
  ExceptionEntryInput,
  ExceptionItemBaseInput,
  ExceptionItemOutcome,
  ExceptionItemOutput,
} from '../../../common/workflows/step_types/exceptions/common/exception_item_schemas';

/**
 * The step action on whose behalf a util call runs; used as the verb phrase
 * of error messages (`Failed to <action>: ...`).
 */
export enum ExceptionItemStepAction {
  CreateRuleException = 'create rule exception',
  CreateExceptionListItem = 'create exception list item',
}

/**
 * The exception item fields both creation APIs accept, i.e. a create-item
 * request body without the list targeting (`list_id` / `namespace_type`).
 */
type CreateExceptionItemBody = Pick<
  CreateExceptionListItemSchema,
  'name' | 'description' | 'type' | 'entries' | 'os_types' | 'tags' | 'expire_time' | 'comments'
>;

const missingEntryKey = (entry: ExceptionEntryInput, key: 'value' | 'values' | 'list') =>
  new ExecutionError({
    type: 'ValidationError',
    message: `Exception entry on field "${entry.field}" is missing \`${key}\`, required for \`${entry.operator}\` entries`,
  });

/**
 * Maps the step's flat, UI-verb entry shape (see `exceptionEntrySchema`) onto
 * the exceptions API's discriminated union of entry `type` + `included`/
 * `excluded` operator. The presence checks mirror the schema's
 * `superRefine`s, which have already run by the time the handler is invoked;
 * they are re-checked here to narrow the optional fields.
 */
export const toApiEntries = (entries: ExceptionEntryInput[]): EntriesArray =>
  entries.map((entry) => {
    const { operator, field, value, values, list } = entry;
    switch (operator) {
      case 'is':
      case 'is_not':
        if (value === undefined) {
          throw missingEntryKey(entry, 'value');
        }
        return {
          type: 'match',
          field,
          operator: operator === 'is' ? 'included' : 'excluded',
          value,
        };
      case 'matches':
      case 'does_not_match':
        if (value === undefined) {
          throw missingEntryKey(entry, 'value');
        }
        return {
          type: 'wildcard',
          field,
          operator: operator === 'matches' ? 'included' : 'excluded',
          value,
        };
      case 'is_one_of':
      case 'is_not_one_of':
        if (values === undefined) {
          throw missingEntryKey(entry, 'values');
        }
        return {
          type: 'match_any',
          field,
          operator: operator === 'is_one_of' ? 'included' : 'excluded',
          value: values,
        };
      case 'exists':
      case 'does_not_exist':
        return {
          type: 'exists',
          field,
          operator: operator === 'exists' ? 'included' : 'excluded',
        };
      case 'is_in_list':
      case 'is_not_in_list':
        if (list === undefined) {
          throw missingEntryKey(entry, 'list');
        }
        return {
          type: 'list',
          field,
          operator: operator === 'is_in_list' ? 'included' : 'excluded',
          list,
        };
      default:
        return assertUnreachable(operator);
    }
  });

/**
 * Builds the create-item request body shared by the rule exceptions API and
 * the exception list items API from the step's item fields.
 */
export const toCreateExceptionItemBody = (
  input: ExceptionItemBaseInput
): CreateExceptionItemBody => {
  const { name, description, entries, os_types: osTypes, tags, expire_time: expireTime } = input;
  const comments = input.comments?.map((comment) => ({ comment }));

  return {
    name,
    description,
    type: 'simple',
    entries: toApiEntries(entries),
    ...(osTypes && osTypes.length > 0 ? { os_types: osTypes } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(expireTime !== undefined ? { expire_time: expireTime } : {}),
    ...(comments && comments.length > 0 ? { comments } : {}),
  };
};

/**
 * Validates an exception item response body against the API's
 * `ExceptionListItem` response schema.
 *
 * @param body   The item as returned by an exceptions API.
 * @param action The step action, used as the failure message's verb phrase.
 */
export const validateExceptionItemResponse = (
  body: unknown,
  action: ExceptionItemStepAction
): ExceptionListItem => {
  const parsed = ExceptionListItem.safeParse(body);
  if (!parsed.success) {
    throw new ExecutionError({
      type: 'ApiError',
      message: `Failed to ${action}: unexpected exception item response shape`,
      details: { issues: stringifyZodError(parsed.error) },
    });
  }
  return parsed.data;
};

/**
 * Builds the step output (the summary slice promised by
 * `exceptionItemOutputSchema`) from a validated exception item.
 *
 * @param item    The validated item.
 * @param outcome What the step did with the item; forwarded to the output.
 */
export const toExceptionItemOutput = (
  item: ExceptionListItem,
  outcome: ExceptionItemOutcome
): { output: ExceptionItemOutput } => ({
  output: {
    id: item.id,
    item_id: item.item_id,
    list_id: item.list_id,
    namespace_type: item.namespace_type,
    name: item.name,
    created_at: item.created_at,
    created_by: item.created_by,
    ...(item.expire_time !== undefined ? { expire_time: item.expire_time } : {}),
    outcome,
  },
});

/**
 * Minimal validation of a rule read response: just enough to find its
 * `rule_default` exception list, tolerating the rest of the (large) rule
 * shape.
 */
const ruleWithExceptionsListSchema = z.object({
  exceptions_list: z.array(RuleExceptionList).optional(),
});

/**
 * Finds the `list_id` of the rule's own default exception list (the list
 * `createExceptionItemForRule` creates/appends to), or `undefined` when the
 * rule has none yet. A rule has at most one `rule_default` list (enforced by
 * `checkDefaultRuleExceptionListReferences` on the create-rule-exceptions
 * route). Does not catch 404s: a missing rule is a real failure, not a
 * "no default list" case.
 */
export const findRuleDefaultExceptionListId = async (
  contextManager: StepHandlerContext['contextManager'],
  action: ExceptionItemStepAction,
  ruleId: string
): Promise<string | undefined> => {
  const { body } = await contextManager.callKibanaApi<unknown>({
    method: 'GET',
    path: `${DETECTION_ENGINE_RULES_URL}?id=${encodeURIComponent(ruleId)}`,
  });
  const parsed = ruleWithExceptionsListSchema.safeParse(body);
  if (!parsed.success) {
    throw new ExecutionError({
      type: 'ApiError',
      message: `Failed to ${action}: unexpected rule response shape`,
      details: { issues: stringifyZodError(parsed.error) },
    });
  }
  return parsed.data.exceptions_list?.find((list) => list.type === 'rule_default')?.list_id;
};

/**
 * Looks up an exception item by its human-readable `item_id` within a
 * namespace. `item_id` is not scoped to a particular list: an item matching
 * `itemId` can belong to any list in the namespace, not necessarily the one
 * a caller has in mind, so callers that care which list it's on must check
 * the returned item's `list_id` themselves (see `findRuleDefaultExceptionListId`
 * for why `createRuleExceptionStepDefinition` does). Returns `undefined` when
 * no item exists.
 */
export const findExceptionItemByItemId = async (
  contextManager: StepHandlerContext['contextManager'],
  action: ExceptionItemStepAction,
  itemId: string,
  namespaceType: NamespaceType
): Promise<ExceptionListItem | undefined> => {
  try {
    const { body } = await contextManager.callKibanaApi<unknown>({
      method: 'GET',
      path: `${EXCEPTION_LIST_ITEM_URL}?item_id=${encodeURIComponent(
        itemId
      )}&namespace_type=${namespaceType}`,
    });
    return validateExceptionItemResponse(body, action);
  } catch (error) {
    if (error instanceof KibanaApiCallError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Looks up an exception item by `itemId` and checks it belongs to the list a
 * caller has in mind, since `item_id` is not scoped to a particular list
 * (see `findExceptionItemByItemId`). Returns the item when it matches,
 * `undefined` when no item exists with that `item_id`, and throws a
 * `ConflictError` when a different, unrelated item shares the `item_id`.
 */
export const findExceptionItemForOwnList = async ({
  contextManager,
  action,
  itemId,
  namespaceType,
  resolveOwnListId,
}: {
  contextManager: StepHandlerContext['contextManager'];
  action: ExceptionItemStepAction;
  itemId: string;
  namespaceType: NamespaceType;
  /** Called only once a candidate is found */
  resolveOwnListId: () => Promise<string | undefined>;
}): Promise<ExceptionListItem | undefined> => {
  const candidate = await findExceptionItemByItemId(contextManager, action, itemId, namespaceType);
  if (candidate === undefined) {
    return undefined;
  }

  const ownListId = await resolveOwnListId();
  if (candidate.list_id === ownListId) {
    return candidate;
  }

  let expectedList = `the expected list (list_id: "${ownListId}")`;
  if (ownListId === undefined) {
    expectedList = `the expected list (which does not exist yet)`;
  }

  throw new ExecutionError({
    type: 'ConflictError',
    message:
      `Failed to ${action}: item_id "${itemId}" already exists on a different exception ` +
      `list (list_id: "${candidate.list_id}"), not ${expectedList}. Choose a different item_id, ` +
      `or manage that item directly.`,
  });
};

/**
 * Creates an exception item on the rule identified by `ruleId` via the rule
 * exceptions API, which places it on the rule's default exception list
 * (creating that list if the rule has none). When `itemId` is undefined the
 * API assigns one.
 */
export const createExceptionItemForRule = async (
  contextManager: StepHandlerContext['contextManager'],
  action: ExceptionItemStepAction,
  ruleId: string,
  itemId: string | undefined,
  item: ExceptionItemBaseInput
): Promise<ExceptionListItem> => {
  const { body } = await contextManager.callKibanaApi<unknown[]>({
    method: 'POST',
    path: CREATE_RULE_EXCEPTIONS_URL.replace('{id}', encodeURIComponent(ruleId)),
    body: {
      items: [
        {
          ...(itemId !== undefined ? { item_id: itemId } : {}),
          ...toCreateExceptionItemBody(item),
        },
      ],
    },
  });
  // The API creates one item per submitted item; we always submit exactly one.
  return validateExceptionItemResponse(body?.[0], action);
};

/**
 * Creates an exception item in the list identified by `list_id` /
 * `namespace_type` via the exception list items API. The list must already
 * exist. When `itemId` is undefined the API assigns one.
 */
export const createExceptionItemInList = async (
  contextManager: StepHandlerContext['contextManager'],
  action: ExceptionItemStepAction,
  listId: string,
  namespaceType: NamespaceType,
  itemId: string | undefined,
  item: ExceptionItemBaseInput
): Promise<ExceptionListItem> => {
  const { body } = await contextManager.callKibanaApi<unknown>({
    method: 'POST',
    path: EXCEPTION_LIST_ITEM_URL,
    body: {
      list_id: listId,
      namespace_type: namespaceType,
      ...(itemId !== undefined ? { item_id: itemId } : {}),
      ...toCreateExceptionItemBody(item),
    },
  });
  return validateExceptionItemResponse(body, action);
};

/**
 * Updates the exception item identified by `item_id` with the step's item
 * fields. Comments are intentionally not sent: the update API appends any
 * id-less comment to the existing ones (editing/deleting is not possible; see
 * `transformUpdateCommentsToComments` in the lists plugin), so sending them
 * would append a duplicate comment on every overwrite. Existing comments are
 * always preserved by the API regardless.
 */
export const updateExceptionItemByItemId = async (
  contextManager: StepHandlerContext['contextManager'],
  action: ExceptionItemStepAction,
  itemId: string,
  namespaceType: NamespaceType,
  item: ExceptionItemBaseInput
): Promise<ExceptionListItem> => {
  const { comments, ...updateBody } = toCreateExceptionItemBody(item);
  const { body } = await contextManager.callKibanaApi<unknown>({
    method: 'PUT',
    path: EXCEPTION_LIST_ITEM_URL,
    body: {
      item_id: itemId,
      namespace_type: namespaceType,
      ...updateBody,
    },
  });
  return validateExceptionItemResponse(body, action);
};
