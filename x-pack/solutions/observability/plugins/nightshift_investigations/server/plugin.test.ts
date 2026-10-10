/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_INVESTIGATION_LOCATOR_ID } from '../common/locators';
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

const createSetupDeps = () =>
  ({
    share: { url: new MockUrlService() },
    taskManager: {
      registerTaskDefinitions: jest.fn(),
    },
  } as unknown as NightshiftInvestigationsSetupDeps);

describe('NightshiftInvestigationsPlugin setup', () => {
  it('registers the investigation locator on the server', async () => {
    const dependencies = createSetupDeps();
    createPlugin().setup(coreMock.createSetup(), dependencies);
    const locator = dependencies.share.url.locators.get(NIGHTSHIFT_INVESTIGATION_LOCATOR_ID);
    expect(await locator?.getLocation({ investigationId: 'inv/1' })).toEqual({
      app: 'nightshift',
      path: '?investigationId=inv%2F1',
      state: {},
    });
  });

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

  it('registers investigation steps when Cortex, memory, and decision trees are disabled', () => {
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

    expect(registerStepDefinition.mock.calls.map(([definition]) => definition.id)).toEqual(
      expect.arrayContaining([
        'nightshift.resolveModel',
        'nightshift.sendNotifications',
        'nightshift.obtainSandbox',
        'nightshift.cortexHydrate',
        'nightshift.memoryMaterializeToSandbox',
        'nightshift.composeHydrateNotifications',
        'nightshift.cortexOptimize',
        'nightshift.memoryOptimize',
      ])
    );
  });
});
