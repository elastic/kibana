/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const riskScoreBaseIndexName = 'risk-score';

export const allRiskScoreIndexPattern = '.ds-risk-score*';

export const latestRiskScoreIndexPattern = 'risk-score.risk-score-latest-*';

export const getRiskScoreLatestIndex = (spaceId = 'default') =>
  `${riskScoreBaseIndexName}.risk-score-latest-${spaceId}`;

export const getRiskScoreTimeSeriesIndex = (spaceId = 'default') =>
  `${riskScoreBaseIndexName}.risk-score-${spaceId}`;
