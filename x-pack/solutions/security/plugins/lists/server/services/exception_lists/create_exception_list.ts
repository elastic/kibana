/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type {
  Description,
  ExceptionListSchema,
  ExceptionListType,
  Immutable,
  ListId,
  MetaOrUndefined,
  Name,
  NamespaceType,
  OsTypeArray,
  Tags,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Version } from '@kbn/securitysolution-io-ts-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectToExceptionList } from './utils';

interface CreateExceptionListOptions {
  listId: ListId;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  immutable: Immutable;
  meta: MetaOrUndefined;
  user: string;
  tags: Tags;
  osTypes: OsTypeArray;
  tieBreaker?: string;
  type: ExceptionListType;
  version: Version;
}

export const createExceptionList = async ({
  listId,
  immutable,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  osTypes,
  meta,
  user,
  tags,
  tieBreaker,
  type,
  version,
}: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const dateNow = new Date().toISOString();
  const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(savedObjectType, {
    comments: undefined,
    created_at: dateNow,
    created_by: user,
    description,
    entries: undefined,
    expire_time: undefined,
    immutable,
    item_id: undefined,
    list_id: listId,
    list_type: 'list',
    meta,
    name,
    os_types: osTypes,
    tags,
    tie_breaker_id: tieBreaker ?? uuidv4(),
    type,
    updated_by: user,
    version,
  });
  return transformSavedObjectToExceptionList({ savedObject });
};
