/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { InvestigationQuotaCallback, NightshiftInvestigationsSetupDeps } from './types';
import { NightshiftInvestigationsPlugin } from './plugin';

const createPlugin = (memoryEnabled = false) =>
  new NightshiftInvestigationsPlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      sandbox: undefined,
      cortex: { enabled: false },
      decision_trees: { enabled: true },
      memory: { enabled: memoryEnabled },
    })
  );

const createSetupDeps = (): NightshiftInvestigationsSetupDeps => ({});

describe('NightshiftInvestigationsPlugin setup', () => {
  it('accepts one investigation quota callback', () => {
    const setup = createPlugin().setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    expect(() => setup.registerInvestigationQuota(callback)).not.toThrow();
  });

  it('rejects a second investigation quota callback registration', () => {
    const setup = createPlugin().setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    setup.registerInvestigationQuota(callback);

    expect(() => setup.registerInvestigationQuota(callback)).toThrow(
      'Investigation quota callback is already registered'
    );
  });

  it('registers model resolution when Cortex and decision trees are disabled', () => {
    const registerStepDefinition = jest.fn();
    const dependencies = {
      ...createSetupDeps(),
      workflowsManagement: {},
      workflowsExtensions: {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
        registerStepDefinition,
      },
    } as unknown as NightshiftInvestigationsSetupDeps;

    createPlugin().setup(coreMock.createSetup(), dependencies);

    expect(registerStepDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'nightshift.resolveModel' })
    );
  });
});
