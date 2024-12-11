/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { DefaultUuid } from '@kbn/securitysolution-io-ts-types';
import { nonEmptyEndpointEntriesArray } from '../../common/endpoint/entries';
import { exceptionListItemType } from '../../common/exception_list_item_type';
import { DefaultCreateCommentsArray } from '../../common/default_create_comments_array';
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { CreateCommentsArray } from '../../common/create_comment';
import { Tags } from '../../common/tags';
import { ItemId } from '../../common/item_id';
import { EntriesArray } from '../../common/entries';
import { description } from '../../common/description';
import { name } from '../../common/name';
import { meta } from '../../common/meta';
import { tags } from '../../common/tags';

export const createEndpointListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEndpointEntriesArray,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      comments: DefaultCreateCommentsArray, // defaults to empty array if not set during decode
      item_id: DefaultUuid, // defaults to GUID (uuid v4) if not set during decode
      meta, // defaults to undefined if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateEndpointListItemSchema = t.OutputOf<typeof createEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateEndpointListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createEndpointListItemSchema>>,
  'tags' | 'item_id' | 'entries' | 'comments' | 'os_types'
> & {
  comments: CreateCommentsArray;
  tags: Tags;
  item_id: ItemId;
  entries: EntriesArray;
  os_types: OsTypeArray;
};
