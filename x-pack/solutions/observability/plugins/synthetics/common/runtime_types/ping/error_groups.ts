/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const ErrorGroupItemType = t.type({
  timestamp: t.string,
  monitorName: t.string,
  monitorType: t.string,
  configId: t.string,
  stateId: t.string,
  checkGroup: t.string,
  locationName: t.string,
  locationId: t.string,
  durationMs: t.number,
  errorMessage: t.string,
});

export type ErrorGroupItem = t.TypeOf<typeof ErrorGroupItemType>;

export const ErrorGroupHistogramBucketType = t.type({
  timestamp: t.number,
  count: t.number,
});

export type ErrorGroupHistogramBucket = t.TypeOf<typeof ErrorGroupHistogramBucketType>;

export const ErrorGroupPatternType = t.keyof({
  persistent: null,
  intermittent: null,
  new: null,
});

export type ErrorGroupPattern = t.TypeOf<typeof ErrorGroupPatternType>;

export const ErrorGroupType = t.type({
  name: t.string,
  sampleMessage: t.string,
  pattern: ErrorGroupPatternType,
  count: t.number,
  monitorCount: t.number,
  locationCount: t.number,
  firstSeen: t.string,
  lastSeen: t.string,
  histogram: t.array(ErrorGroupHistogramBucketType),
  items: t.array(ErrorGroupItemType),
});

export type ErrorGroup = t.TypeOf<typeof ErrorGroupType>;

export const ErrorGroupsResponseType = t.type({
  groups: t.array(ErrorGroupType),
});

export type ErrorGroupsResponse = t.TypeOf<typeof ErrorGroupsResponseType>;
