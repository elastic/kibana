/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

export const include_expired_exceptions = t.keyof({ true: null, false: null });
export const includeExpiredExceptionsOrUndefined = t.union([
  include_expired_exceptions,
  t.undefined,
]);
export type IncludeExpiredExceptionsOrUndefined = t.TypeOf<
  typeof includeExpiredExceptionsOrUndefined
>;
