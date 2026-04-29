/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DefaultArray } from '@kbn/securitysolution-io-ts-types';

export const osType = t.keyof({
  linux: null,
  macos: null,
  windows: null,
});
export type OsType = t.TypeOf<typeof osType>;

export const osTypeArray = DefaultArray(osType);
export type OsTypeArray = t.TypeOf<typeof osTypeArray>;

export const osTypeArrayOrUndefined = t.union([osTypeArray, t.undefined]);
export type OsTypeArrayOrUndefined = t.OutputOf<typeof osTypeArray>;
