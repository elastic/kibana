/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

export const sort_order = t.keyof({ asc: null, desc: null });
export const sortOrderOrUndefined = t.union([sort_order, t.undefined]);
export type SortOrderOrUndefined = t.TypeOf<typeof sortOrderOrUndefined>;
