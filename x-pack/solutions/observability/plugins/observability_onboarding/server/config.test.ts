/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('observability onboarding config schema', () => {
  it('defaults apiEndpoints tokens to undefined', () => {
    const validated = config.schema.validate({});
    expect(validated.apiEndpoints.collectorToKibanaToken).toBeUndefined();
    expect(validated.apiEndpoints.collectorWatchUrl).toBeUndefined();
  });

  it('accepts provided apiEndpoints values', () => {
    const validated = config.schema.validate({
      apiEndpoints: {
        collectorWatchUrl: 'https://collector.example',
        kibanaToCollectorToken: 'k2c',
        collectorToKibanaToken: 'c2k',
        targetType: 'hosted',
        targetId: 'dep-1',
      },
    });
    expect(validated.apiEndpoints.collectorToKibanaToken).toBe('c2k');
    expect(validated.apiEndpoints.targetId).toBe('dep-1');
  });
});
