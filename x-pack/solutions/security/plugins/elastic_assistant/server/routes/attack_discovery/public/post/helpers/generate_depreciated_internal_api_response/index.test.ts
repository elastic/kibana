/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateDepreciatedInternalApiResponse } from '.';

describe('generateDepreciatedInternalApiResponse', () => {
  it('returns the expected placeholder AttackDiscoveryResponse', () => {
    const response = generateDepreciatedInternalApiResponse();

    expect(response).toEqual(
      expect.objectContaining({
        alertsContextCount: 0,
        apiConfig: {
          actionTypeId: '',
          connectorId: '',
        },
        attackDiscoveries: [],
        averageIntervalMs: 0,
        backingIndex: '',
        createdAt: expect.any(String),
        generationIntervals: [],
        id: expect.any(String),
        lastViewedAt: expect.any(String),
        namespace: '',
        status: 'running',
        timestamp: expect.any(String),
        updatedAt: expect.any(String),
        users: [],
      })
    );
  });
});
