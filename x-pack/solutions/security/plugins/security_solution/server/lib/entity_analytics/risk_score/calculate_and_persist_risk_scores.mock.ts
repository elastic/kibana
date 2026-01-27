/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CalculationResults } from './calculate_and_persist_risk_scores';

const buildResponseMock = (overrides: Partial<CalculationResults> = {}): CalculationResults => ({
  after_keys: {
    host: { 'host.name': 'hostname' },
  },
  errors: [],
  scores_written: 2,
  entities: {
    host: ['hostname'],
    user: [],
    service: [],
    generic: [],
  },
  ...overrides,
});

export const calculateAndPersistRiskScoresMock = {
  buildResponse: buildResponseMock,
};
