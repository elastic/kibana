/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const name = t.string;
export type Name = t.TypeOf<typeof name>;
export const nameOrUndefined = t.union([name, t.undefined]);
export type NameOrUndefined = t.TypeOf<typeof nameOrUndefined>;
