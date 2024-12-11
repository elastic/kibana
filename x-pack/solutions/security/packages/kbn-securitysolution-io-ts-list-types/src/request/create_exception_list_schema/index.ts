/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import {
  DefaultUuid,
  DefaultVersionNumber,
  DefaultVersionNumberDecoded,
} from '@kbn/securitysolution-io-ts-types';

import { exceptionListType } from '../../common/exception_list';
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { Tags } from '../../common/tags';
import { ListId } from '../../common/list_id';
import { NamespaceType } from '../../common/default_namespace';
import { name } from '../../common/name';
import { description } from '../../common/description';
import { namespace_type } from '../../common/namespace_type';
import { tags } from '../../common/tags';
import { meta } from '../../common/meta';

export const createExceptionListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type: exceptionListType,
    })
  ),
  t.exact(
    t.partial({
      list_id: DefaultUuid, // defaults to a GUID (UUID v4) string if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
      version: DefaultVersionNumber, // defaults to numerical 1 if not set during decode
    })
  ),
]);

export type CreateExceptionListSchema = t.OutputOf<typeof createExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createExceptionListSchema>>,
  'tags' | 'list_id' | 'namespace_type' | 'os_types'
> & {
  tags: Tags;
  list_id: ListId;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
  version: DefaultVersionNumberDecoded;
};
