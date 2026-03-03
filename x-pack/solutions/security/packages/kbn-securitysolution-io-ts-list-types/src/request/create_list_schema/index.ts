/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { DefaultVersionNumberDecoded } from '@kbn/securitysolution-io-ts-types';
import { DefaultVersionNumber } from '@kbn/securitysolution-io-ts-types';

import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { name } from '../../common/name';
import { description } from '../../common/description';
import { type } from '../../common/type';
import { deserializer } from '../../common/deserializer';
import { id } from '../../common/id';
import { meta } from '../../common/meta';
import { serializer } from '../../common/serializer';

export const createListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type,
    })
  ),
  t.exact(
    t.partial({
      deserializer, // defaults to undefined if not set during decode
      id, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      serializer, // defaults to undefined if not set during decode
      version: DefaultVersionNumber, // defaults to a numerical 1 if not set during decode
    })
  ),
]);

export type CreateListSchema = t.OutputOf<typeof createListSchema>;
export type CreateListSchemaDecoded = RequiredKeepUndefined<
  Omit<t.TypeOf<typeof createListSchema>, 'version'>
> & { version: DefaultVersionNumberDecoded };
