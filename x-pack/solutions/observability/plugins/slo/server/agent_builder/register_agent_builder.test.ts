/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SLO_MANAGEMENT_SKILL_ID } from '@kbn/slo-schema';
import { registerAgentBuilder } from './register_agent_builder';
import type { SLOPluginSetupDependencies } from '../types';

const createPlugins = (
  agentBuilder?: ReturnType<typeof agentBuilderMocks.createSetup>
): SLOPluginSetupDependencies =>
  ({
    agentBuilder,
  } as unknown as SLOPluginSetupDependencies);

const createLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('registerAgentBuilder', () => {
  it('registers the slo-management skill', () => {
    const core = coreMock.createSetup();
    const agentBuilder = agentBuilderMocks.createSetup();
    const plugins = createPlugins(agentBuilder);
    const logger = createLogger();

    registerAgentBuilder({
      core: core as any,
      plugins,
      getScopedClients: jest.fn(),
      config: { isServerless: false, getIsCpsEnabled: () => false },
      logger: logger as any,
    });

    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(1);
    const [registeredSkill] = agentBuilder.skills.register.mock.calls[0];
    expect(registeredSkill.id).toBe(SLO_MANAGEMENT_SKILL_ID);
  });

  it('is a no-op when agentBuilder is not provided', () => {
    const core = coreMock.createSetup();
    const plugins = createPlugins(undefined);
    const logger = createLogger();

    expect(() =>
      registerAgentBuilder({
        core: core as any,
        plugins,
        getScopedClients: jest.fn(),
        config: { isServerless: false, getIsCpsEnabled: () => false },
        logger: logger as any,
      })
    ).not.toThrow();
  });

  it('logs an error and does not rethrow when skills.register throws', () => {
    const core = coreMock.createSetup();
    const agentBuilder = agentBuilderMocks.createSetup();
    agentBuilder.skills.register.mockImplementation(() => {
      throw new Error('registration failed');
    });
    const plugins = createPlugins(agentBuilder);
    const logger = createLogger();

    expect(() =>
      registerAgentBuilder({
        core: core as any,
        plugins,
        getScopedClients: jest.fn(),
        config: { isServerless: false, getIsCpsEnabled: () => false },
        logger: logger as any,
      })
    ).not.toThrow();

    expect(logger.error).toHaveBeenCalled();
  });
});
