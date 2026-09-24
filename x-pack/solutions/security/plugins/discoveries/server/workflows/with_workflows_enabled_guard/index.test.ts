/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { DiscoveriesPluginStartDeps } from '../../types';
import { withWorkflowsEnabledGuard } from '.';

const buildGetStartServices = (enabled: boolean) => async () => ({
  coreStart: {
    featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(enabled) },
  } as unknown as CoreStart,
  pluginsStart: {} as unknown as DiscoveriesPluginStartDeps,
});

describe('withWorkflowsEnabledGuard', () => {
  it('preserves the original step definition fields', () => {
    const stepDefinition = { handler: jest.fn(), id: 'step-1' };

    const guarded = withWorkflowsEnabledGuard(stepDefinition, buildGetStartServices(true));

    expect(guarded.id).toBe('step-1');
  });

  it('invokes the wrapped handler when the feature flag is ON', async () => {
    const handler = jest.fn().mockResolvedValue('result');
    const stepDefinition = { handler, id: 'step-1' };

    const guarded = withWorkflowsEnabledGuard(stepDefinition, buildGetStartServices(true));
    const context = { input: 'x' };

    await expect(guarded.handler(context)).resolves.toBe('result');
    expect(handler).toHaveBeenCalledWith(context);
  });

  it('throws before running the wrapped handler when the feature flag is OFF', async () => {
    const handler = jest.fn().mockResolvedValue('result');
    const stepDefinition = { handler, id: 'step-1' };

    const guarded = withWorkflowsEnabledGuard(stepDefinition, buildGetStartServices(false));

    await expect(guarded.handler({ input: 'x' })).rejects.toThrow(
      'Attack Discovery workflows are not enabled'
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
