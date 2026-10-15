/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalDetectionEngineRoutes } from './route';

const runRoute =
  internalDetectionEngineRoutes['POST /internal/significant_events/detection_engine/_run'];
const stopRoute =
  internalDetectionEngineRoutes['POST /internal/significant_events/detection_engine/lab/_stop'];

describe('detection engine routes', () => {
  it('accepts a run request without a body, as Run now sends it', () => {
    expect(runRoute.params.safeParse({ body: null }).success).toBe(true);
    expect(runRoute.params.safeParse({}).success).toBe(true);
  });

  it('accepts a run request for a past bucket', () => {
    expect(runRoute.params.safeParse({ body: { now: '2026-10-15T10:00:01.000Z' } }).success).toBe(
      true
    );
  });

  it('rejects a run time that is not an ISO date', () => {
    expect(runRoute.params.safeParse({ body: { now: 'yesterday' } }).success).toBe(false);
  });

  it('accepts stopping every lab incident without a body', () => {
    expect(stopRoute.params.safeParse({ body: null }).success).toBe(true);
  });
});
