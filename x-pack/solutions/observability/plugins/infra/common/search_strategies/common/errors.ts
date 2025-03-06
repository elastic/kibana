/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const abortedRequestSearchStrategyErrorRT = rt.type({
  type: rt.literal('aborted'),
});

export type AbortedRequestSearchStrategyError = rt.TypeOf<
  typeof abortedRequestSearchStrategyErrorRT
>;

const genericSearchStrategyErrorRT = rt.type({
  type: rt.literal('generic'),
  message: rt.string,
});

export type GenericSearchStrategyError = rt.TypeOf<typeof genericSearchStrategyErrorRT>;

const shardFailureSearchStrategyErrorRT = rt.type({
  type: rt.literal('shardFailure'),
  shardInfo: rt.type({
    shard: rt.union([rt.number, rt.null]),
    index: rt.union([rt.string, rt.null]),
    node: rt.union([rt.string, rt.null]),
  }),
  message: rt.union([rt.string, rt.null]),
});

export type ShardFailureSearchStrategyError = rt.TypeOf<typeof shardFailureSearchStrategyErrorRT>;

export const searchStrategyErrorRT = rt.union([
  abortedRequestSearchStrategyErrorRT,
  genericSearchStrategyErrorRT,
  shardFailureSearchStrategyErrorRT,
]);

export type SearchStrategyError = rt.TypeOf<typeof searchStrategyErrorRT>;
