/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { plugin } from '.';
import { significantEventsBridge } from './bridge';

const createDeps = () => ({
  agentBuilder: {
    tools: { register: jest.fn() },
    attachments: { registerType: jest.fn() },
    skills: { register: jest.fn().mockResolvedValue(undefined) },
    agents: { registerType: jest.fn() },
  },
  workflowsExtensions: {
    registerStepDefinition: jest.fn(),
    registerTriggerDefinition: jest.fn(),
    registerManagedWorkflowOwner: jest.fn(),
  },
  workflowsManagement: {},
});

const createCore = () => ({
  analytics: { registerEventType: jest.fn(), reportEvent: jest.fn(), optIn: jest.fn() },
  dataStreams: { registerDataStream: jest.fn() },
  savedObjects: { registerType: jest.fn() },
  getStartServices: jest.fn(),
});

describe('significant events tasks entry', () => {
  it('registers the workflow steps and what it contributes to Agent Builder in a pod', async () => {
    const deps = createDeps();
    const core = createCore();
    const instance = await plugin(coreMock.createPluginInitializerContext());

    instance.setup(core as never, deps as never);

    expect(deps.workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(2);
    expect(deps.agentBuilder.tools.register).toHaveBeenCalledTimes(14);
    expect(deps.agentBuilder.attachments.registerType).toHaveBeenCalledTimes(3);
    expect(deps.agentBuilder.agents.registerType).toHaveBeenCalledTimes(3);
    // The KI identification skill needs the workflows management API, a pod has none.
    expect(deps.agentBuilder.skills.register).toHaveBeenCalledTimes(6);
    expect(core.savedObjects.registerType).toHaveBeenCalledTimes(2);
    expect(core.dataStreams.registerDataStream).toHaveBeenCalledTimes(2);
  });

  it('leaves the Agent Builder contributions to the server entry when it ran in this process', async () => {
    significantEventsBridge.setSetup(true);
    try {
      const deps = createDeps();
      const core = createCore();
      const instance = await plugin(coreMock.createPluginInitializerContext());

      instance.setup(core as never, deps as never);

      expect(deps.workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(2);
      expect(deps.agentBuilder.tools.register).not.toHaveBeenCalled();
      expect(core.savedObjects.registerType).not.toHaveBeenCalled();
    } finally {
      significantEventsBridge.setSetup(undefined as never);
    }
  });
});
