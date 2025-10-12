/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kpiRiskScore } from '.';
import { buildKpiRiskScoreQuery } from './query.kpi_risk_score.dsl';

import { mockOptions } from './__mocks__';

jest.mock('./query.kpi_risk_score.dsl');

describe('buildKpiRiskScoreQuery search strategy', () => {
  const buildKpiRiskScoreQueryMock = jest.mocked(buildKpiRiskScoreQuery);

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      kpiRiskScore.buildDsl(mockOptions);
      expect(buildKpiRiskScoreQueryMock).toHaveBeenCalledWith(mockOptions);
    });
  });
});
