/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

// [Sort field value, tiebreaker value]
export const paginationCursorRT = rt.tuple([
  rt.union([rt.string, rt.number]),
  rt.union([rt.string, rt.number]),
]);

export type PaginationCursor = rt.TypeOf<typeof paginationCursorRT>;

export const anomalyTypeRT = rt.keyof({
  metrics_hosts: null,
  metrics_k8s: null,
});

export type AnomalyType = rt.TypeOf<typeof anomalyTypeRT>;

const sortOptionsRT = rt.keyof({
  anomalyScore: null,
  dataset: null,
  startTime: null,
});

const sortDirectionsRT = rt.keyof({
  asc: null,
  desc: null,
});

const paginationPreviousPageCursorRT = rt.type({
  searchBefore: paginationCursorRT,
});

const paginationNextPageCursorRT = rt.type({
  searchAfter: paginationCursorRT,
});

export const paginationRT = rt.intersection([
  rt.type({
    pageSize: rt.number,
  }),
  rt.partial({
    cursor: rt.union([paginationPreviousPageCursorRT, paginationNextPageCursorRT]),
  }),
]);

export type Pagination = rt.TypeOf<typeof paginationRT>;

export const sortRT = rt.type({
  field: sortOptionsRT,
  direction: sortDirectionsRT,
});

export type Sort = rt.TypeOf<typeof sortRT>;

export const metricRT = rt.keyof({
  memory_usage: null,
  network_in: null,
  network_out: null,
});

export type Metric = rt.TypeOf<typeof metricRT>;
