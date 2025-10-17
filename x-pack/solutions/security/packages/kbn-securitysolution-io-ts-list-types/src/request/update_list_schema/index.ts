/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { version } from '@kbn/securitysolution-io-ts-types';
import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { name } from '../../common/name';
import { description } from '../../common/description';
import { _version } from '../../common/underscore_version';
import { meta } from '../../common/meta';

export const updateListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      id,
      name,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      version, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateListSchema = t.OutputOf<typeof updateListSchema>;
export type UpdateListSchemaDecoded = RequiredKeepUndefined<t.TypeOf<typeof updateListSchema>>;
