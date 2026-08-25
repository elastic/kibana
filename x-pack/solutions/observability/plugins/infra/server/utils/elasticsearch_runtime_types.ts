/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const shardFailureRT = rt.partial({
  index: rt.union([rt.string, rt.null]),
  node: rt.union([rt.string, rt.null]),
  reason: rt.partial({
    reason: rt.union([rt.string, rt.null]),
    type: rt.union([rt.string, rt.null]),
  }),
  shard: rt.number,
});

export const commonSearchSuccessResponseFieldsRT = rt.type({
  _shards: rt.intersection([
    rt.type({
      total: rt.number,
      successful: rt.number,
      skipped: rt.number,
      failed: rt.number,
    }),
    rt.partial({
      failures: rt.array(shardFailureRT),
    }),
  ]),
  timed_out: rt.boolean,
  took: rt.number,
});
