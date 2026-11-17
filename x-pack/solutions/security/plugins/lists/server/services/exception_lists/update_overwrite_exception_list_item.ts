/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';

import {
  transformSavedObjectUpdateToExceptionListItem,
  transformUpdateCommentsToComments,
} from './utils';
import { getExceptionListItem } from './get_exception_list_item';
import { assertAppliesToIsNotChanged, validateItemForList } from './utils/esql_output_columns';
import type { UpdateExceptionListItemOptions } from './update_exception_list_item';

export const updateOverwriteExceptionListItem = async ({
  _version,
  appliesTo,
  comments,
  entries,
  expireTime,
  id,
  savedObjectsClient,
  namespaceType,
  name,
  osTypes,
  description,
  itemId,
  meta,
  user,
  tags,
  type,
}: UpdateExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionListItem = await getExceptionListItem({
    id,
    itemId,
    namespaceType,
    savedObjectsClient,
  });
  if (exceptionListItem == null) {
    return null;
  } else {
    // This update replaces the item: an item without `appliesTo` applies to the source documents
    assertAppliesToIsNotChanged({ requested: appliesTo, stored: exceptionListItem.applies_to });
    await validateItemForList({
      appliesTo,
      entries,
      listId: exceptionListItem.list_id,
      namespaceType,
      osTypes,
      savedObjectsClient,
    });
    const transformedComments = transformUpdateCommentsToComments({
      comments,
      existingComments: exceptionListItem.comments,
      user,
    });
    const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(
      savedObjectType,
      {
        applies_to: appliesTo ?? exceptionListItem.applies_to,
        comments: transformedComments,
        created_at: exceptionListItem.created_at,
        created_by: exceptionListItem.created_by,
        description: description ?? exceptionListItem.description,
        entries,
        expire_time: expireTime,
        immutable: undefined,
        item_id: itemId ?? exceptionListItem.item_id,
        list_id: exceptionListItem.list_id,
        list_type: 'item',
        meta,
        name: name ?? exceptionListItem.name,
        os_types: osTypes,
        tags: tags ?? exceptionListItem.tags,
        tie_breaker_id: exceptionListItem.tie_breaker_id,
        type: type ?? exceptionListItem.type,
        updated_by: user,
        // An item has no version of its own. The version of the saved object is a string (`_version`), which parseInt read as NaN.
        version: undefined,
      },
      {
        id: id ?? exceptionListItem.id,
        overwrite: true,
        version: _version,
      }
    );
    return transformSavedObjectUpdateToExceptionListItem({
      exceptionListItem,
      savedObject,
    });
  }
};
