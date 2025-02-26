/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { ExceptionListItemEntryArray } from '@kbn/securitysolution-exceptions-common/api';
import type { NamespaceType } from '../../common/default_namespace';
import { DefaultUpdateCommentsArray } from '../../common/default_update_comments_array';
import { exceptionListItemType } from '../../common/exception_list_item_type';
import { nonEmptyEntriesArray } from '../../common/non_empty_entries_array';
import type { OsTypeArray } from '../../common/os_type';
import { osTypeArrayOrUndefined } from '../../common/os_type';
import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import type { Tags } from '../../common/tags';
import { tags } from '../../common/tags';
import type { UpdateCommentsArray } from '../../common/update_comment';
import { description } from '../../common/description';
import { name } from '../../common/name';
import { _version } from '../../common/underscore_version';
import { id } from '../../common/id';
import { item_id } from '../../common/item_id';
import { meta } from '../../common/meta';
import { namespace_type } from '../../common/namespace_type';
import type { ExpireTimeOrUndefined } from '../../common';
import { expireTimeOrUndefined } from '../../common';

export const updateExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEntriesArray,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      comments: DefaultUpdateCommentsArray, // defaults to empty array if not set during decode
      expire_time: expireTimeOrUndefined,
      id, // defaults to undefined if not set during decode
      item_id,
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type UpdateExceptionListItemSchema = t.OutputOf<typeof updateExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type UpdateExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof updateExceptionListItemSchema>>,
  'tags' | 'entries' | 'namespace_type' | 'comments' | 'os_types' | 'expire_time'
> & {
  comments: UpdateCommentsArray;
  tags: Tags;
  entries: ExceptionListItemEntryArray;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
  expire_time: ExpireTimeOrUndefined;
};
