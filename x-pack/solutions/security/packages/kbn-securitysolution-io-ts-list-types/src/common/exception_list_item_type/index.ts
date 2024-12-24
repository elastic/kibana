/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const exceptionListItemType = t.keyof({ simple: null });
export const exceptionListItemTypeOrUndefined = t.union([exceptionListItemType, t.undefined]);
export type ExceptionListItemType = t.TypeOf<typeof exceptionListItemType>;
export type ExceptionListItemTypeOrUndefined = t.TypeOf<typeof exceptionListItemTypeOrUndefined>;
