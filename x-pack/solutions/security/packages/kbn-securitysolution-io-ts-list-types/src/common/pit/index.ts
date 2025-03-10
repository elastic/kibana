/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const pitId = t.string;
export const pit = t.exact(
  t.type({
    id: pitId,
    keepAlive: t.union([t.string, t.undefined]),
  })
);
export const pitOrUndefined = t.union([pit, t.undefined]);

export type Pit = t.TypeOf<typeof pit>;
export type PitId = t.TypeOf<typeof pitId>;
export type PitOrUndefined = t.TypeOf<typeof pitOrUndefined>;
