/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ENTITY_CORRELATION_ENABLED_FEATURE_FLAG,
  isEntityCorrelationEnabled,
} from '.';

describe('isEntityCorrelationEnabled', () => {
  it('queries the attackDiscoveryEntityCorrelationEnabled flag with a `false` default (OFF by default)', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(false);

    await isEntityCorrelationEnabled({ getBooleanValue });

    expect(getBooleanValue).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_ENTITY_CORRELATION_ENABLED_FEATURE_FLAG,
      false
    );
  });

  it('returns true when the flag is enabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);

    expect(await isEntityCorrelationEnabled({ getBooleanValue })).toBe(true);
  });

  it('returns false when the flag is disabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(false);

    expect(await isEntityCorrelationEnabled({ getBooleanValue })).toBe(false);
  });
});
