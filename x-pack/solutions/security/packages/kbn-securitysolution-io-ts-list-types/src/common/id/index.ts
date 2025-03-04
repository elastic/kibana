/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export const id = NonEmptyString;
export type Id = t.TypeOf<typeof id>;
export const ids = t.array(NonEmptyString);
export type Ids = t.TypeOf<typeof ids>;
export const idOrUndefined = t.union([id, t.undefined]);
export type IdOrUndefined = t.TypeOf<typeof idOrUndefined>;
