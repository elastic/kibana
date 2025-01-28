/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const ML_SEVERITY_SCORES = {
  warning: 3,
  minor: 25,
  major: 50,
  critical: 75,
};

export type MLSeverityScoreCategories = keyof typeof ML_SEVERITY_SCORES;

export const ML_SEVERITY_COLORS = {
  critical: 'rgb(228, 72, 72)',
  major: 'rgb(229, 113, 0)',
  minor: 'rgb(255, 221, 0)',
  warning: 'rgb(125, 180, 226)',
};

export const getSeverityCategoryForScore = (
  score: number
): MLSeverityScoreCategories | undefined => {
  if (score >= ML_SEVERITY_SCORES.critical) {
    return 'critical';
  } else if (score >= ML_SEVERITY_SCORES.major) {
    return 'major';
  } else if (score >= ML_SEVERITY_SCORES.minor) {
    return 'minor';
  } else if (score >= ML_SEVERITY_SCORES.warning) {
    return 'warning';
  } else {
    // Category is too low to include
    return undefined;
  }
};

export const formatOneDecimalPlace = (number: number) => {
  return Math.round(number * 10) / 10;
};

export const getFriendlyNameForPartitionId = (partitionId: string) => {
  return partitionId !== '' ? partitionId : 'unknown';
};

export const compareDatasetsByMaximumAnomalyScore = <
  Dataset extends { maximumAnomalyScore: number }
>(
  firstDataset: Dataset,
  secondDataset: Dataset
) => firstDataset.maximumAnomalyScore - secondDataset.maximumAnomalyScore;

// Generic Sort

const sortDirectionsRT = rt.keyof({
  asc: null,
  desc: null,
});

export const sortRT = <Fields extends rt.Mixed>(fields: Fields) =>
  rt.type({
    field: fields,
    direction: sortDirectionsRT,
  });

// Pagination
// [Sort field value, tiebreaker value]
export const paginationCursorRT = rt.tuple([
  rt.union([rt.string, rt.number]),
  rt.union([rt.string, rt.number]),
]);

export type PaginationCursor = rt.TypeOf<typeof paginationCursorRT>;

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
