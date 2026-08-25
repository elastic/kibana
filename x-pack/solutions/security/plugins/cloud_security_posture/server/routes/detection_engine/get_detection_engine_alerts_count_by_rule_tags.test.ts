/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import type { CspRouter } from '../../types';
import { defineGetDetectionEngineAlertsStatus } from './get_detection_engine_alerts_count_by_rule_tags';

describe('detection engine alerts status request validation', () => {
  it('accepts rule tags up to the alerting limit of 512 characters and rejects longer tags', () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    defineGetDetectionEngineAlertsStatus(router as unknown as CspRouter);

    const route = router.versioned.get.mock.results[0].value;
    const routeDefinition = route.addVersion.mock.calls[0][0];
    const querySchema = routeDefinition.validate.request.query;

    expect(() => querySchema.validate({ tags: ['a'.repeat(512)] })).not.toThrow();
    expect(() => querySchema.validate({ tags: ['a'.repeat(513)] })).toThrow();
  });
});
