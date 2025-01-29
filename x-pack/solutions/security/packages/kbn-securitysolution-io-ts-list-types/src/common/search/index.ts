/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const search = t.string;
export type Search = t.TypeOf<typeof search>;

export const searchOrUndefined = t.union([search, t.undefined]);
export type SearchOrUndefined = t.TypeOf<typeof searchOrUndefined>;
