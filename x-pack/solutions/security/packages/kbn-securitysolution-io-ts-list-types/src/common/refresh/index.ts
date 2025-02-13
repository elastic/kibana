/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const refresh = t.union([t.literal('true'), t.literal('false')]);
export const refreshWithWaitFor = t.union([
  t.literal('true'),
  t.literal('false'),
  t.literal('wait_for'),
]);
export type Refresh = t.TypeOf<typeof refresh>;
export type RefreshWithWaitFor = t.TypeOf<typeof refreshWithWaitFor>;
