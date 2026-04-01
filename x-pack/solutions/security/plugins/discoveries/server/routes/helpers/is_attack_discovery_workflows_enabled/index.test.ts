/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
  isAttackDiscoveryWorkflowsEnabled,
} from '.';

describe('isAttackDiscoveryWorkflowsEnabled', () => {
  const makeContext = (value: boolean): RequestHandlerContext => {
    const getBooleanValue = jest.fn().mockResolvedValue(value);
    return {
      core: Promise.resolve({
        featureFlags: { getBooleanValue },
      }),
    } as unknown as RequestHandlerContext;
  };

  it('returns true when the feature flag is enabled', async () => {
    const context = makeContext(true);

    const result = await isAttackDiscoveryWorkflowsEnabled(context);

    expect(result).toBe(true);
  });

  it('returns false when the feature flag is disabled', async () => {
    const context = makeContext(false);

    const result = await isAttackDiscoveryWorkflowsEnabled(context);

    expect(result).toBe(false);
  });

  it('checks the correct feature flag name with false as the fallback', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);
    const context = {
      core: Promise.resolve({
        featureFlags: { getBooleanValue },
      }),
    } as unknown as RequestHandlerContext;

    await isAttackDiscoveryWorkflowsEnabled(context);

    expect(getBooleanValue).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
      false
    );
  });
});
