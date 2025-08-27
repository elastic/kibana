/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { DefaultVersionNumberDecoded } from '@kbn/securitysolution-io-ts-types';
import { DefaultUuid, DefaultVersionNumber } from '@kbn/securitysolution-io-ts-types';

import { exceptionListType } from '../../common/exception_list';
import type { OsTypeArray } from '../../common/os_type';
import { osTypeArrayOrUndefined } from '../../common/os_type';
import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import type { Tags } from '../../common/tags';
import { tags } from '../../common/tags';
import type { ListId } from '../../common/list_id';
import type { NamespaceType } from '../../common/default_namespace';
import { name } from '../../common/name';
import { description } from '../../common/description';
import { namespace_type } from '../../common/namespace_type';
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
