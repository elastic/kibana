/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalyBand } from './anomaly_bands';

export const getHiddenBandsFilters = (anomalyBands: AnomalyBand[]) => {
  const hiddenBands = anomalyBands.filter((each) => each.hidden);
  const recordScoreFilterClause = (eachHiddenBand: AnomalyBand) =>
    `| WHERE record_score < ${eachHiddenBand.start} OR record_score >= ${eachHiddenBand.end} `;
  return hiddenBands.map(recordScoreFilterClause).join('');
};
