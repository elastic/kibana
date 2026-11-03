/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { OBSERVABILITY_TOOL_IDS } from '../tools/register_tools';
import { plugin } from '.';
import { observabilityAgentBuilderBridge } from './bridge';

const createAgentBuilder = () => ({
  tools: { register: jest.fn() },
  skills: { register: jest.fn() },
  attachments: { registerType: jest.fn() },
});

describe('observability agent builder tasks entry', () => {
  it('registers every tool, the skill and the attachment types in a pod', async () => {
    const agentBuilder = createAgentBuilder();
    const instance = await plugin(coreMock.createPluginInitializerContext());

    const setup = instance.setup(
      { getStartServices: jest.fn() } as never,
      {
        agentBuilder,
        apmDataAccess: {},
        metricsDataAccess: {},
      } as never
    );

    // The registration of tools and attachments is asynchronous.
    await new Promise((resolve) => setImmediate(resolve));

    expect(agentBuilder.tools.register.mock.calls.map(([tool]) => tool.id).sort()).toEqual(
      [...OBSERVABILITY_TOOL_IDS].sort()
    );
    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(1);
    expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(9);
    expect(setup.registerDataProvider).toEqual(expect.any(Function));
  });

  it('registers nothing when the server entry ran in this process', async () => {
    observabilityAgentBuilderBridge.setSetup(true);
    try {
      const agentBuilder = createAgentBuilder();
      const instance = await plugin(coreMock.createPluginInitializerContext());

      const setup = instance.setup(
        { getStartServices: jest.fn() } as never,
        {
          agentBuilder,
          apmDataAccess: {},
          metricsDataAccess: {},
        } as never
      );
      await new Promise((resolve) => setImmediate(resolve));

      expect(agentBuilder.tools.register).not.toHaveBeenCalled();
      expect(agentBuilder.skills.register).not.toHaveBeenCalled();
      expect(agentBuilder.attachments.registerType).not.toHaveBeenCalled();
      expect(() => setup.registerDataProvider('apmServiceSummary', jest.fn())).not.toThrow();
    } finally {
      observabilityAgentBuilderBridge.setSetup(undefined as never);
    }
  });
});
