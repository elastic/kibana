/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectType, getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectToExceptionListItem } from './utils';

interface BulkCreateExceptionListItemsOptions {
  items: CreateExceptionListItemSchema[];
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
  tieBreaker?: string;
}

export const bulkCreateExceptionListItems = async ({
  items,
  savedObjectsClient,
  tieBreaker,
  user,
}: BulkCreateExceptionListItemsOptions): Promise<ExceptionListItemSchema[]> => {
  const formattedItems = items.map((item) => {
    const savedObjectType = getSavedObjectType({ namespaceType: item.namespace_type ?? 'single' });
    const dateNow = new Date().toISOString();

    return {
      attributes: {
        comments: [],
        created_at: dateNow,
        created_by: user,
        description: item.description,
        entries: item.entries,
        expire_time: item.expire_time,
        immutable: false,
        item_id: item.item_id,
        list_id: item.list_id,
        list_type: 'item',
        meta: item.meta,
        name: item.name,
        os_types: item.os_types,
        tags: item.tags,
        tie_breaker_id: tieBreaker ?? uuidv4(),
        type: item.type,
        updated_by: user,
        version: undefined,
      },
      type: savedObjectType,
    } as { attributes: ExceptionListSoSchema; type: SavedObjectType };
  });

  const { saved_objects: savedObjects } =
    await savedObjectsClient.bulkCreate<ExceptionListSoSchema>(formattedItems);

  const result = savedObjects.map<ExceptionListItemSchema>((so) =>
    transformSavedObjectToExceptionListItem({ savedObject: so })
  );

  return result;
};
