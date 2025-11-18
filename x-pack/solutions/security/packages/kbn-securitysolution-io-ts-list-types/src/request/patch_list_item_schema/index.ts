/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { _version } from '../../common/underscore_version';
import { id } from '../../common/id';
import { meta } from '../../common/meta';
import { value } from '../../common/value';
import { refresh } from '../../common/refresh';

export const patchListItemSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(t.partial({ _version, meta, value, refresh })),
]);

export type PatchListItemSchema = t.OutputOf<typeof patchListItemSchema>;
export type PatchListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof patchListItemSchema>
>;
