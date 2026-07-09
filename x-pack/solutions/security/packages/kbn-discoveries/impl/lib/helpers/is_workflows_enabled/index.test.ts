/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG, isWorkflowsEnabled } from '.';

describe('isWorkflowsEnabled', () => {
  it('queries the attackDiscoveryWorkflowsEnabled flag with a safe `false` default', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);

    await isWorkflowsEnabled({ getBooleanValue });

    expect(getBooleanValue).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
      false
    );
  });

  it('returns true when the flag is enabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);

    expect(await isWorkflowsEnabled({ getBooleanValue })).toBe(true);
  });

  it('returns false when the flag is disabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(false);

    expect(await isWorkflowsEnabled({ getBooleanValue })).toBe(false);
  });
});
