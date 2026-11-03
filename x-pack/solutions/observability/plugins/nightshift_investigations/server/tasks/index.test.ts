/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { plugin } from '.';
import { nightshiftInvestigationsBridge } from './bridge';

const createContext = () =>
  ({
    config: { get: () => ({ cortex: { enabled: true }, memory: { enabled: false } }) },
    logger: { get: () => ({ get: jest.fn(), debug: jest.fn(), info: jest.fn() }) },
  } as never);

const createDeps = () => ({
  workflowsExtensions: {
    registerStepDefinition: jest.fn(),
    registerTriggerDefinition: jest.fn(),
    registerManagedWorkflowOwner: jest.fn(),
  },
  agentBuilder: { tools: { register: jest.fn() } },
});

describe('nightshiftInvestigations tasks entry', () => {
  it('registers the steps, triggers and time converter tool in a pod', async () => {
    const deps = createDeps();
    const core = coreMock.createSetup();
    (await plugin(createContext())).setup(core as never, deps as never);

    const stepIds = deps.workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([definition]) => definition.id
    );
    expect(stepIds).toEqual(
      expect.arrayContaining([
        'nightshift.resolveModel',
        'nightshift.triggerInvestigation',
        'nightshift.obtainSandbox',
      ])
    );
    expect(deps.workflowsExtensions.registerTriggerDefinition).toHaveBeenCalled();
    expect(deps.agentBuilder.tools.register).toHaveBeenCalledTimes(1);
  });

  it('registers nothing where the server entry already did (Kibana)', async () => {
    nightshiftInvestigationsBridge.setSetup(true);
    try {
      const deps = createDeps();
      (await plugin(createContext())).setup(coreMock.createSetup() as never, deps as never);
      expect(deps.workflowsExtensions.registerStepDefinition).not.toHaveBeenCalled();
      expect(deps.agentBuilder.tools.register).not.toHaveBeenCalled();
    } finally {
      nightshiftInvestigationsBridge.setSetup(undefined as never);
    }
  });
});
